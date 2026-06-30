import type { RawFact, SourceBundle } from "../schema/types.js";

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const YEARS_RE = /(\d+(?:\.\d+)?)\s*(?:\+?\s*)?years?\s+(?:of\s+)?experience/i;
const SKILL_RE =
  /\b(JavaScript|TypeScript|React|Node\.?js|Python|GraphQL|AWS|Docker|Kubernetes|SQL|PostgreSQL|MongoDB|Java|Go|C\+\+)\b/gi;
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/i;
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[\w-]+/i;

export function parseRecruiterNotes(path: string, content: string): SourceBundle {
  const warnings: string[] = [];
  const facts: RawFact[] = [];
  const source = path;
  const base = { source, sourceType: "recruiter_notes" as const, method: "regex_extract" as const, confidence: 0.6 };

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // First non-empty line often contains name if prefixed
  for (const line of lines) {
    const nameMatch = line.match(/^(?:candidate|name)[:\s]+(.+)/i);
    if (nameMatch) {
      facts.push({ field: "full_name", value: nameMatch[1].trim(), ...base });
      break;
    }
  }

  const emails = content.match(EMAIL_RE) ?? [];
  for (const e of [...new Set(emails)]) {
    facts.push({ field: "email", value: e, ...base });
  }

  const phones = content.match(PHONE_RE) ?? [];
  for (const p of [...new Set(phones)]) {
    facts.push({ field: "phone", value: p, ...base });
  }

  const years = content.match(YEARS_RE);
  if (years) {
    facts.push({ field: "years_experience", value: parseFloat(years[1]), ...base });
  }

  const skills = content.match(SKILL_RE) ?? [];
  for (const s of [...new Set(skills.map((x) => x.toLowerCase()))]) {
    facts.push({ field: "skill", value: s, ...base });
  }

  const linkedin = content.match(LINKEDIN_RE);
  if (linkedin) facts.push({ field: "linkedin", value: linkedin[0], ...base });

  const github = content.match(GITHUB_RE);
  if (github) facts.push({ field: "github", value: github[0], ...base });

  // Headline from a line starting with "Headline:" or first sentence
  const headlineMatch = content.match(/headline[:\s]+(.+)/i);
  if (headlineMatch) {
    facts.push({ field: "headline", value: headlineMatch[1].trim(), ...base });
  }

  // Experience snippets: "at CompanyName as Title"
  const expMatch = content.match(/at\s+([A-Z][\w\s&.]+?)\s+as\s+([A-Z][\w\s]+)/i);
  if (expMatch) {
    facts.push({ field: "company", value: expMatch[1].trim(), ...base });
    facts.push({ field: "title", value: expMatch[2].trim(), ...base });
  }

  return { path, sourceType: "recruiter_notes", facts, warnings };
}
