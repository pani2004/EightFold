import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { RawFact } from "../schema/types.js";

const SKILL_ALIASES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  "java script": "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  react: "React",
  reactjs: "React",
  "react.js": "React",
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  python: "Python",
  py: "Python",
  graphql: "GraphQL",
  gql: "GraphQL",
  aws: "AWS",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  sql: "SQL",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  java: "Java",
  "c++": "C++",
  golang: "Go",
  go: "Go",
};

export function canonicalizeSkill(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 2) return null;
  const key = trimmed.toLowerCase();
  if (SKILL_ALIASES[key]) return SKILL_ALIASES[key];
  // Title-case unknown skills
  return trimmed
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizePhone(phone: string, defaultCountry = "US"): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry as "US");
    if (parsed?.isValid()) return parsed.format("E.164");
  } catch {
    // fall through
  }
  return null;
}

export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // YYYY-MM
  const iso = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  // MM/YYYY or M/YYYY
  const slash = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`;

  // Month YYYY
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const monthYear = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYear) {
    const m = months[monthYear[1].slice(0, 3).toLowerCase()];
    if (m) return `${monthYear[2]}-${m}`;
  }

  // YYYY only -> YYYY-01
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01`;

  // present / current
  if (/^(present|current|now)$/i.test(trimmed)) return null;

  return null;
}

export function normalizeCountry(raw: string): string | null {
  const map: Record<string, string> = {
    us: "US", usa: "US", "united states": "US", "u.s.": "US",
    in: "IN", india: "IN",
    uk: "GB", gb: "GB", "united kingdom": "GB",
    ca: "CA", canada: "CA",
    de: "DE", germany: "DE",
    au: "AU", australia: "AU",
  };
  const key = raw.trim().toLowerCase();
  if (map[key]) return map[key];
  if (/^[A-Z]{2}$/i.test(raw.trim())) return raw.trim().toUpperCase();
  return null;
}

export function normalizeFacts(facts: RawFact[]): RawFact[] {
  return facts.map((fact) => {
    const v = fact.value;
    switch (fact.field) {
      case "email":
      case "emails":
        if (typeof v === "string") {
          const n = normalizeEmail(v);
          return { ...fact, value: n, confidence: n ? fact.confidence : fact.confidence * 0.5 };
        }
        break;
      case "phone":
      case "phones":
        if (typeof v === "string") {
          const n = normalizePhone(v);
          return { ...fact, value: n, confidence: n ? fact.confidence : fact.confidence * 0.5 };
        }
        break;
      case "skill":
        if (typeof v === "string") {
          const n = canonicalizeSkill(v);
          return { ...fact, value: n, confidence: n ? fact.confidence : fact.confidence * 0.3 };
        }
        break;
      case "experience_start":
      case "experience_end":
        if (typeof v === "string") {
          const n = normalizeDate(v);
          return { ...fact, value: n, confidence: n ? fact.confidence : fact.confidence * 0.5 };
        }
        break;
      case "country":
        if (typeof v === "string") {
          const n = normalizeCountry(v);
          return { ...fact, value: n };
        }
        break;
      case "full_name":
        if (typeof v === "string") {
          return { ...fact, value: v.trim().replace(/\s+/g, " ") || null };
        }
        break;
    }
    return fact;
  }).filter((f) => f.value !== null && f.value !== undefined && f.value !== "");
}
