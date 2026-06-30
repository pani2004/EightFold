export type SourceType =
  | "recruiter_csv"
  | "ats_json"
  | "recruiter_notes"
  | "unknown";

export type SourceMethod = "structured_parse" | "regex_extract" | "heuristic";

export interface ProvenanceEntry {
  source: string;
  method: SourceMethod;
}

export interface SkillEntry {
  name: string;
  confidence: number;
  sources: string[];
}

export interface ExperienceEntry {
  company: string;
  title: string;
  start: string | null;
  end: string | null;
  summary: string | null;
}

export interface EducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  end_year: number | null;
}

export interface Location {
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface Links {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  other: string[];
}

export interface CanonicalProfile {
  candidate_id: string;
  full_name: string | null;
  emails: string[];
  phones: string[];
  location: Location;
  links: Links;
  headline: string | null;
  years_experience: number | null;
  skills: SkillEntry[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  provenance: Record<string, ProvenanceEntry>;
  overall_confidence: number;
}

export interface RawFact {
  field: string;
  value: unknown;
  source: string;
  sourceType: SourceType;
  method: SourceMethod;
  confidence: number;
}

export interface SourceBundle {
  path: string;
  sourceType: SourceType;
  facts: RawFact[];
  warnings: string[];
}

export type OnMissing = "null" | "omit" | "error";

export type NormalizeRule = "E164" | "canonical" | "lowercase";

export interface FieldConfig {
  path: string;
  from?: string;
  type: "string" | "string[]" | "number" | "object";
  required?: boolean;
  normalize?: NormalizeRule;
}

export interface OutputConfig {
  fields: FieldConfig[];
  include_confidence?: boolean;
  include_provenance?: boolean;
  on_missing?: OnMissing;
}

export const SOURCE_CONFIDENCE: Record<SourceType, number> = {
  recruiter_csv: 0.9,
  ats_json: 0.85,
  recruiter_notes: 0.6,
  unknown: 0.3,
};
