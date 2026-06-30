import type { RawFact, SourceBundle } from "../schema/types.js";

interface AtsPayload {
  applicant?: {
    fullName?: string;
    contactEmail?: string;
    mobileNumber?: string;
    locationCity?: string;
    locationState?: string;
    locationCountry?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    summary?: string;
    totalYears?: number;
  };
  work_history?: Array<{
    employer?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education_history?: Array<{
    school?: string;
    degreeName?: string;
    major?: string;
    graduationYear?: number;
  }>;
  skill_tags?: string[];
}

export function parseAtsJson(path: string, content: string): SourceBundle {
  const warnings: string[] = [];
  const facts: RawFact[] = [];
  const source = path;
  const base = { source, sourceType: "ats_json" as const, method: "structured_parse" as const, confidence: 0.85 };

  let data: AtsPayload;
  try {
    data = JSON.parse(content) as AtsPayload;
  } catch {
    warnings.push(`Invalid JSON in ${path}`);
    return { path, sourceType: "ats_json", facts, warnings };
  }

  const a = data.applicant;
  if (a?.fullName) facts.push({ field: "full_name", value: a.fullName, ...base });
  if (a?.contactEmail) facts.push({ field: "email", value: a.contactEmail, ...base });
  if (a?.mobileNumber) facts.push({ field: "phone", value: a.mobileNumber, ...base });
  if (a?.locationCity) facts.push({ field: "city", value: a.locationCity, ...base });
  if (a?.locationState) facts.push({ field: "region", value: a.locationState, ...base });
  if (a?.locationCountry) facts.push({ field: "country", value: a.locationCountry, ...base });
  if (a?.linkedInUrl) facts.push({ field: "linkedin", value: a.linkedInUrl, ...base });
  if (a?.githubUrl) facts.push({ field: "github", value: a.githubUrl, ...base });
  if (a?.portfolioUrl) facts.push({ field: "portfolio", value: a.portfolioUrl, ...base });
  if (a?.summary) facts.push({ field: "headline", value: a.summary, ...base });
  if (a?.totalYears != null) facts.push({ field: "years_experience", value: a.totalYears, ...base });

  for (const job of data.work_history ?? []) {
    if (job.employer) facts.push({ field: "company", value: job.employer, ...base });
    if (job.role) facts.push({ field: "title", value: job.role, ...base });
    if (job.startDate) facts.push({ field: "experience_start", value: job.startDate, ...base });
    if (job.endDate) facts.push({ field: "experience_end", value: job.endDate, ...base });
    if (job.description) facts.push({ field: "experience_summary", value: job.description, ...base });
  }

  for (const edu of data.education_history ?? []) {
    if (edu.school) facts.push({ field: "institution", value: edu.school, ...base });
    if (edu.degreeName) facts.push({ field: "degree", value: edu.degreeName, ...base });
    if (edu.major) facts.push({ field: "field", value: edu.major, ...base });
    if (edu.graduationYear != null) facts.push({ field: "end_year", value: edu.graduationYear, ...base });
  }

  for (const skill of data.skill_tags ?? []) {
    facts.push({ field: "skill", value: skill, ...base });
  }

  return { path, sourceType: "ats_json", facts, warnings };
}
