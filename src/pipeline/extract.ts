import type { DetectedSource } from "./detect.js";
import type { SourceBundle } from "../schema/types.js";
import { parseRecruiterCsv } from "../sources/recruiter-csv.js";
import { parseAtsJson } from "../sources/ats-json.js";
import { parseRecruiterNotes } from "../sources/recruiter-notes.js";

export function extractFromSource(detected: DetectedSource): SourceBundle {
  const warnings: string[] = [];
  const { path, sourceType, content } = detected;

  if (!content && sourceType === "unknown") {
    warnings.push(`Could not read or recognize source: ${path}`);
    return { path, sourceType, facts: [], warnings };
  }

  try {
    switch (sourceType) {
      case "recruiter_csv":
        return parseRecruiterCsv(path, content);
      case "ats_json":
        return parseAtsJson(path, content);
      case "recruiter_notes":
        return parseRecruiterNotes(path, content);
      default:
        warnings.push(`Unknown source type for ${path}; skipping`);
        return { path, sourceType, facts: [], warnings };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to parse ${path}: ${message}`);
    return { path, sourceType, facts: [], warnings };
  }
}

export function extractAll(detected: DetectedSource[]): {
  bundles: SourceBundle[];
  allWarnings: string[];
} {
  const bundles = detected.map(extractFromSource);
  const allWarnings = bundles.flatMap((b) => b.warnings);
  return { bundles, allWarnings };
}
