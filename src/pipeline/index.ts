import { detectSources, type InputSource } from "./detect.js";
import { extractAll } from "./extract.js";
import { normalizeFacts } from "./normalize.js";
import { mergeFacts } from "./merge.js";
import { computeConfidence } from "./confidence.js";
import { DEFAULT_OUTPUT_CONFIG, projectProfile } from "./project.js";
import { validateCanonical, validateOutputConfig } from "../schema/validate.js";
import type { CanonicalProfile, OutputConfig } from "../schema/types.js";

export interface PipelineResult {
  canonical: CanonicalProfile;
  output: Record<string, unknown>;
  warnings: string[];
}

export function runPipeline(
  sources: InputSource[],
  config?: OutputConfig
): PipelineResult {
  const warnings: string[] = [];

  const detected = detectSources(sources);
  const { bundles, allWarnings } = extractAll(detected);
  warnings.push(...allWarnings);

  const rawFacts = bundles.flatMap((b) => b.facts);
  const normalized = normalizeFacts(rawFacts);
  const merged = mergeFacts(normalized);
  const withConfidence = computeConfidence(merged);
  const canonical = validateCanonical(withConfidence);

  const outputConfig = config ?? DEFAULT_OUTPUT_CONFIG;
  validateOutputConfig(outputConfig);

  let output: Record<string, unknown>;
  if (config) {
    output = projectProfile(canonical, outputConfig);
  } else {
    output = { ...canonical } as unknown as Record<string, unknown>;
  }

  return { canonical, output, warnings };
}

export function parseConfig(jsonString: string): OutputConfig {
  const parsed = JSON.parse(jsonString) as unknown;
  return validateOutputConfig(parsed);
}

export type { InputSource };
