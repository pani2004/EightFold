import type { SourceType } from "../schema/types.js";

export interface InputSource {
  name: string;
  content: string;
}

export interface DetectedSource {
  path: string;
  sourceType: SourceType;
  content: string;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

function extname(path: string): string {
  const name = basename(path);
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

export function detectSource(source: InputSource): DetectedSource {
  const { name: path, content } = source;

  if (!content) {
    return { path, sourceType: "unknown", content: "" };
  }

  const ext = extname(path).toLowerCase();
  const name = basename(path).toLowerCase();

  if (ext === ".csv") {
    return { path, sourceType: "recruiter_csv", content };
  }

  if (ext === ".json") {
    try {
      const parsed = JSON.parse(content);
      if (
        parsed &&
        typeof parsed === "object" &&
        ("applicant" in parsed ||
          "candidate" in parsed ||
          "contact_info" in parsed ||
          "work_history" in parsed)
      ) {
        return { path, sourceType: "ats_json", content };
      }
    } catch {
      // fall through
    }
    return { path, sourceType: "unknown", content };
  }

  if (ext === ".txt" || name.includes("note")) {
    return { path, sourceType: "recruiter_notes", content };
  }

  return { path, sourceType: "unknown", content };
}

export function detectSources(sources: InputSource[]): DetectedSource[] {
  return sources.map(detectSource);
}
