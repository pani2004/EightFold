import type { RawFact, SourceBundle } from "../schema/types.js";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseRecruiterCsv(path: string, content: string): SourceBundle {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const warnings: string[] = [];
  const facts: RawFact[] = [];

  if (lines.length < 2) {
    warnings.push(`CSV ${path} has no data rows`);
    return { path, sourceType: "recruiter_csv", facts, warnings };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const row = parseCsvLine(lines[1]);
  const record: Record<string, string> = {};
  headers.forEach((h, i) => {
    record[h] = row[i] ?? "";
  });

  const source = path;
  const base = { source, sourceType: "recruiter_csv" as const, method: "structured_parse" as const, confidence: 0.9 };

  if (record.name) facts.push({ field: "full_name", value: record.name, ...base });
  if (record.email) facts.push({ field: "email", value: record.email, ...base });
  if (record.phone) facts.push({ field: "phone", value: record.phone, ...base });
  if (record.current_company) facts.push({ field: "company", value: record.current_company, ...base });
  if (record.title) facts.push({ field: "title", value: record.title, ...base });
  if (record.location) facts.push({ field: "city", value: record.location, ...base });

  return { path, sourceType: "recruiter_csv", facts, warnings };
}
