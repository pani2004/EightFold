import { z } from "zod";
import type { CanonicalProfile, OutputConfig } from "./types.js";

const locationSchema = z.object({
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().length(2).nullable().or(z.null()),
});

const skillSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
});

const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable()
    .or(z.null()),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable()
    .or(z.null()),
  summary: z.string().nullable(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  end_year: z.number().int().nullable(),
});

const provenanceSchema = z.record(
  z.object({
    source: z.string(),
    method: z.enum(["structured_parse", "regex_extract", "heuristic"]),
  })
);

export const canonicalProfileSchema = z.object({
  candidate_id: z.string(),
  full_name: z.string().nullable(),
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  location: locationSchema,
  links: z.object({
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
    portfolio: z.string().nullable(),
    other: z.array(z.string()),
  }),
  headline: z.string().nullable(),
  years_experience: z.number().nullable(),
  skills: z.array(skillSchema),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  provenance: provenanceSchema,
  overall_confidence: z.number().min(0).max(1),
});

export const outputConfigSchema = z.object({
  fields: z.array(
    z.object({
      path: z.string(),
      from: z.string().optional(),
      type: z.enum(["string", "string[]", "number", "object"]),
      required: z.boolean().optional(),
      normalize: z.enum(["E164", "canonical", "lowercase"]).optional(),
    })
  ),
  include_confidence: z.boolean().optional(),
  include_provenance: z.boolean().optional(),
  on_missing: z.enum(["null", "omit", "error"]).optional(),
});

export function validateCanonical(profile: unknown): CanonicalProfile {
  return canonicalProfileSchema.parse(profile) as CanonicalProfile;
}

export function validateOutputConfig(config: unknown): OutputConfig {
  return outputConfigSchema.parse(config) as OutputConfig;
}
