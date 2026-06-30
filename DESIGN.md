# Eightfold Candidate Transformer — Technical Design

## Problem

Recruiters accumulate candidate data from many sources (ATS exports, CSV spreadsheets, free-form notes) with inconsistent field names, formats, and quality. The goal is a deterministic pipeline that produces one canonical profile per candidate, tracks provenance, scores confidence, and supports runtime output reshaping without changing the engine.

## Pipeline

```
detect → extract → normalize → merge → confidence → project → validate
```

| Step | Responsibility |
|------|----------------|
| **Detect** | Classify input by extension and content sniffing (CSV, ATS JSON, notes TXT) |
| **Extract** | Structured parse or regex/heuristic extraction into atomic `RawFact` records |
| **Normalize** | E.164 phones, lowercase emails, `YYYY-MM` dates, ISO-3166 alpha-2 countries, canonical skill names |
| **Merge** | Combine facts into canonical profile; resolve conflicts by source confidence |
| **Confidence** | Weighted score across populated fields (skills averaged individually) |
| **Project** | Map canonical record to client schema via runtime JSON config |
| **Validate** | Zod schema check on canonical and projected output |

## Canonical Schema Normalization

| Type | Format | Example |
|------|--------|---------|
| Phone | E.164 | `+14155550198` |
| Email | lowercase trimmed | `priya@email.com` |
| Date | `YYYY-MM` | `2020-01` |
| Country | ISO-3166 alpha-2 | `US` |
| Skills | Canonical dictionary + title-case fallback | `JavaScript`, `Node.js` |

## Merge / Conflict Resolution

- Facts are tagged with `source`, `sourceType`, `method`, and `confidence`.
- Source base confidence: recruiter CSV (0.9) > ATS JSON (0.85) > notes (0.6).
- Scalar fields: highest-confidence value wins; provenance records the winning source.
- Arrays (emails, phones): deduplicate case-insensitively, preserve order by confidence.
- Skills: merge by canonical name; confidence = max across sources; all sources listed.
- Experience/education: align by index from structured ATS; deduplicate by company+title.
- `candidate_id`: SHA-256 hash of primary email (or name fallback), truncated to 12 hex chars.

## Runtime Custom Output

The engine maintains an internal `CanonicalProfile` separate from the projection layer.

Config capabilities:
- Select subset of fields via `fields[]`
- Remap via `"from": "emails[0]"` or `"skills[].name"`
- Per-field `normalize` rules (`E164`, `canonical`, `lowercase`)
- Toggle `include_confidence` and `include_provenance`
- `on_missing`: `null` (default), `omit`, or `error` for required fields

Projected output is coerced to declared `type` and validated before write.

## Edge Cases

| Case | Handling |
|------|----------|
| Missing/unreadable file | Warning logged; pipeline continues with remaining sources |
| Unparseable phone/email | Value becomes `null`; confidence reduced |
| Conflicting names across sources | Higher-confidence structured source wins |
| "present" end dates | Normalized to `null` (current role) |
| Unknown skills | Title-cased; not dropped |
| Garbage JSON | Warning + skip source; no crash |

**Deferred if time-limited:** resume PDF/DOCX parsing, live GitHub/LinkedIn API calls, fuzzy company-name deduplication.

## Input / Output Surface

A minimal React (Vite) web app is the surface. The transformation engine (`runPipeline`) is UI-agnostic and runs entirely client-side: the UI reads uploaded files into memory, calls the engine, and renders the canonical profile (or projected output) plus provenance, confidence, and warnings. Keeping I/O out of the engine means the same code is reusable from a CLI, server, or batch job without changes.

## Scale

Stateless per-candidate processing with no network calls; suitable for batch processing over thousands of records. The engine is pure and synchronous, so it parallelizes trivially across workers.
