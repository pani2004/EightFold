import type { CanonicalProfile } from "../schema/types.js";

const FIELD_WEIGHTS: Record<string, number> = {
  full_name: 0.15,
  emails: 0.1,
  phones: 0.08,
  location: 0.07,
  headline: 0.08,
  years_experience: 0.07,
  skills: 0.15,
  experience: 0.2,
  education: 0.1,
};

function hasValue(profile: CanonicalProfile, field: string): boolean {
  switch (field) {
    case "full_name":
      return profile.full_name != null;
    case "emails":
      return profile.emails.length > 0;
    case "phones":
      return profile.phones.length > 0;
    case "location":
      return !!(profile.location.city || profile.location.region || profile.location.country);
    case "headline":
      return profile.headline != null;
    case "years_experience":
      return profile.years_experience != null;
    case "skills":
      return profile.skills.length > 0;
    case "experience":
      return profile.experience.length > 0;
    case "education":
      return profile.education.length > 0;
    default:
      return false;
  }
}

function fieldConfidence(profile: CanonicalProfile, field: string): number {
  if (!hasValue(profile, field)) return 0;

  const prov = profile.provenance[field];
  const base = prov ? 0.7 : 0.5;

  if (field === "skills" && profile.skills.length > 0) {
    const avg = profile.skills.reduce((s, sk) => s + sk.confidence, 0) / profile.skills.length;
    return avg;
  }

  return base;
}

export function computeConfidence(profile: CanonicalProfile): CanonicalProfile {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    totalWeight += weight;
    weightedSum += fieldConfidence(profile, field) * weight;
  }

  const overall = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  return { ...profile, overall_confidence: Math.min(1, Math.max(0, overall)) };
}
