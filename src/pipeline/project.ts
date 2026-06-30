import type { CanonicalProfile, FieldConfig, OnMissing, OutputConfig } from "../schema/types.js";
import { canonicalizeSkill, normalizePhone } from "./normalize.js";

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    if (part.endsWith("[]")) {
      const key = part.slice(0, -2);
      const arr = (current as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) return undefined;
      return arr;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function extractArrayField(profile: CanonicalProfile, from: string): unknown {
  // skills[].name
  const match = from.match(/^(\w+)\[\]\.(\w+)$/);
  if (match) {
    const [, arrayKey, prop] = match;
    const arr = (profile as unknown as Record<string, unknown[]>)[arrayKey];
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => (item as Record<string, unknown>)[prop]).filter((v) => v != null);
  }
  return getByPath(profile, from);
}

function applyNormalize(value: unknown, rule: FieldConfig["normalize"]): unknown {
  if (value == null || !rule) return value;
  if (rule === "E164" && typeof value === "string") return normalizePhone(value) ?? value;
  if (rule === "lowercase" && typeof value === "string") return value.toLowerCase();
  if (rule === "canonical") {
    if (typeof value === "string") return canonicalizeSkill(value) ?? value;
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? canonicalizeSkill(v) ?? v : v))
        .filter(Boolean);
    }
  }
  return value;
}

function coerceType(value: unknown, type: FieldConfig["type"]): unknown {
  if (value == null) return null;
  switch (type) {
    case "string":
      return Array.isArray(value) ? String(value[0] ?? "") : String(value);
    case "string[]":
      return Array.isArray(value) ? value.map(String) : [String(value)];
    case "number":
      return typeof value === "number" ? value : Number(value);
    case "object":
      return value;
    default:
      return value;
  }
}

export function projectProfile(
  profile: CanonicalProfile,
  config: OutputConfig
): Record<string, unknown> {
  const onMissing: OnMissing = config.on_missing ?? "null";
  const result: Record<string, unknown> = {};

  for (const field of config.fields) {
    const sourcePath = field.from ?? field.path;
    let value: unknown;

    if (sourcePath.includes("[]")) {
      value = extractArrayField(profile, sourcePath);
    } else if (sourcePath.includes("[")) {
      value = getByPath(profile, sourcePath);
    } else {
      value = getByPath(profile, sourcePath);
    }

    const isMissing = value === undefined || value === null || value === "";

    if (isMissing) {
      if (field.required && onMissing === "error") {
        throw new Error(`Required field missing: ${field.path} (from ${sourcePath})`);
      }
      if (onMissing === "omit") continue;
      result[field.path] = null;
      continue;
    }

    value = applyNormalize(value, field.normalize);
    value = coerceType(value, field.type);
    result[field.path] = value;
  }

  if (config.include_confidence) {
    result.overall_confidence = profile.overall_confidence;
  }

  if (config.include_provenance) {
    result.provenance = profile.provenance;
  }

  return result;
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  fields: [
    { path: "candidate_id", type: "string", required: true },
    { path: "full_name", type: "string", required: true },
    { path: "emails", type: "string[]" },
    { path: "phones", type: "string[]", normalize: "E164" },
    { path: "location", type: "object" },
    { path: "links", type: "object" },
    { path: "headline", type: "string" },
    { path: "years_experience", type: "number" },
    { path: "skills", type: "object" },
    { path: "experience", type: "object" },
    { path: "education", type: "object" },
  ],
  include_confidence: true,
  include_provenance: true,
  on_missing: "null",
};
