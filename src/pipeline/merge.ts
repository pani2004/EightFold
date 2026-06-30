import { stableHash } from "./hash.js";
import type {
  CanonicalProfile,
  EducationEntry,
  ExperienceEntry,
  ProvenanceEntry,
  RawFact,
  SkillEntry,
} from "../schema/types.js";

function pickBest<T extends string | number>(
  facts: RawFact[],
  field: string
): { value: T | null; provenance: ProvenanceEntry | null } {
  const matches = facts.filter((f) => f.field === field && f.value != null);
  if (matches.length === 0) return { value: null, provenance: null };
  matches.sort((a, b) => b.confidence - a.confidence);
  const best = matches[0];
  return {
    value: best.value as T,
    provenance: { source: best.source, method: best.method },
  };
}

function collectUnique<T extends string>(
  facts: RawFact[],
  field: string
): { values: T[]; provenance: ProvenanceEntry | null } {
  const seen = new Set<string>();
  const values: T[] = [];
  let prov: ProvenanceEntry | null = null;
  const sorted = [...facts].filter((f) => f.field === field && f.value != null).sort((a, b) => b.confidence - a.confidence);
  for (const f of sorted) {
    const key = String(f.value).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      values.push(f.value as T);
      if (!prov) prov = { source: f.source, method: f.method };
    }
  }
  return { values, provenance: prov };
}

function mergeSkills(facts: RawFact[]): { skills: SkillEntry[]; provenance: ProvenanceEntry | null } {
  const byName = new Map<string, SkillEntry>();
  let prov: ProvenanceEntry | null = null;

  for (const f of facts.filter((x) => x.field === "skill" && x.value)) {
    const name = String(f.value);
    const existing = byName.get(name.toLowerCase());
    if (existing) {
      existing.confidence = Math.max(existing.confidence, f.confidence);
      if (!existing.sources.includes(f.source)) existing.sources.push(f.source);
    } else {
      byName.set(name.toLowerCase(), {
        name,
        confidence: f.confidence,
        sources: [f.source],
      });
      if (!prov) prov = { source: f.source, method: f.method };
    }
  }

  const skills = [...byName.values()].sort((a, b) => b.confidence - a.confidence);
  return { skills, provenance: prov };
}

function mergeExperience(facts: RawFact[]): ExperienceEntry[] {
  const companies = facts.filter((f) => f.field === "company");
  const titles = facts.filter((f) => f.field === "title");
  const starts = facts.filter((f) => f.field === "experience_start");
  const ends = facts.filter((f) => f.field === "experience_end");
  const summaries = facts.filter((f) => f.field === "experience_summary");

  const entries: ExperienceEntry[] = [];
  const maxLen = Math.max(companies.length, titles.length, 1);

  for (let i = 0; i < maxLen; i++) {
    const company = companies[i]?.value ?? companies[0]?.value;
    const title = titles[i]?.value ?? titles[0]?.value;
    if (!company && !title) continue;
    entries.push({
      company: String(company ?? "Unknown"),
      title: String(title ?? "Unknown"),
      start: starts[i]?.value ? String(starts[i].value) : starts[0]?.value ? String(starts[0].value) : null,
      end: ends[i]?.value ? String(ends[i].value) : ends[0]?.value ? String(ends[0].value) : null,
      summary: summaries[i]?.value ? String(summaries[i].value) : summaries[0]?.value ? String(summaries[0].value) : null,
    });
  }

  // Deduplicate by company+title
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.company}|${e.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeEducation(facts: RawFact[]): EducationEntry[] {
  const institutions = facts.filter((f) => f.field === "institution");
  const degrees = facts.filter((f) => f.field === "degree");
  const fields = facts.filter((f) => f.field === "field");
  const endYears = facts.filter((f) => f.field === "end_year");

  const entries: EducationEntry[] = [];
  for (let i = 0; i < institutions.length; i++) {
    entries.push({
      institution: String(institutions[i].value),
      degree: degrees[i]?.value ? String(degrees[i].value) : null,
      field: fields[i]?.value ? String(fields[i].value) : null,
      end_year: endYears[i]?.value != null ? Number(endYears[i].value) : null,
    });
  }
  return entries;
}

export function generateCandidateId(facts: RawFact[]): string {
  const emails = facts.filter((f) => f.field === "email").map((f) => String(f.value));
  const names = facts.filter((f) => f.field === "full_name").map((f) => String(f.value));
  const seed = emails[0] ?? names[0] ?? "unknown";
  return stableHash(seed.toLowerCase(), 12);
}

export function mergeFacts(facts: RawFact[]): CanonicalProfile {
  const provenance: Record<string, ProvenanceEntry> = {};

  const name = pickBest<string>(facts, "full_name");
  if (name.provenance) provenance.full_name = name.provenance;

  const emails = collectUnique<string>(facts, "email");
  if (emails.provenance) provenance.emails = emails.provenance;

  const phones = collectUnique<string>(facts, "phone");
  if (phones.provenance) provenance.phones = phones.provenance;

  const city = pickBest<string>(facts, "city");
  const region = pickBest<string>(facts, "region");
  const country = pickBest<string>(facts, "country");
  if (city.provenance || region.provenance || country.provenance) {
    provenance.location = city.provenance ?? region.provenance ?? country.provenance!;
  }

  const linkedin = pickBest<string>(facts, "linkedin");
  const github = pickBest<string>(facts, "github");
  const portfolio = pickBest<string>(facts, "portfolio");
  if (linkedin.provenance || github.provenance || portfolio.provenance) {
    provenance.links = linkedin.provenance ?? github.provenance ?? portfolio.provenance!;
  }

  const headline = pickBest<string>(facts, "headline");
  if (headline.provenance) provenance.headline = headline.provenance;

  const years = pickBest<number>(facts, "years_experience");
  if (years.provenance) provenance.years_experience = years.provenance;

  const { skills, provenance: skillsProv } = mergeSkills(facts);
  if (skillsProv) provenance.skills = skillsProv;

  const experience = mergeExperience(facts);
  if (experience.length > 0) {
    const expFact = facts.find((f) => f.field === "company");
    if (expFact) provenance.experience = { source: expFact.source, method: expFact.method };
  }

  const education = mergeEducation(facts);
  if (education.length > 0) {
    const eduFact = facts.find((f) => f.field === "institution");
    if (eduFact) provenance.education = { source: eduFact.source, method: eduFact.method };
  }

  return {
    candidate_id: generateCandidateId(facts),
    full_name: name.value,
    emails: emails.values,
    phones: phones.values,
    location: {
      city: city.value,
      region: region.value,
      country: country.value,
    },
    links: {
      linkedin: linkedin.value,
      github: github.value,
      portfolio: portfolio.value,
      other: [],
    },
    headline: headline.value,
    years_experience: years.value,
    skills,
    experience,
    education,
    provenance,
    overall_confidence: 0,
  };
}
