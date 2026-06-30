# Eightfold Candidate Transformer

A React (Vite) web app that ingests messy, multi-source candidate data and produces a single canonical profile with provenance and confidence scores. Supports runtime output projection via JSON config. The transformation engine runs entirely in the browser — no backend required.

## Quick Start

```bash
npm install
npm run dev      # start the UI at http://localhost:5173
npm test         # run the engine test suite
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Using the UI

1. Run `npm run dev` and open http://localhost:5173.
2. Click **Load sample data** to populate example sources, or use the dropzone to add your own `.csv`, `.json` (ATS), or `.txt` (notes) files.
3. Each source shows its auto-detected type (structured vs unstructured).
4. Leave **Custom projection** off for the full canonical profile, or toggle it on and edit the JSON config to reshape the output.
5. Click **Transform** to see the candidate ID, confidence, warnings, and the resulting JSON. Use **Download JSON** to save it.

## Supported Sources

| Source | Group | Detection |
|--------|-------|-----------|
| Recruiter CSV | Structured | `.csv` extension |
| ATS JSON | Structured | `.json` with `applicant`, `work_history`, etc. |
| Recruiter notes | Unstructured | `.txt` or filename containing `note` |

## Pipeline

```
detect → extract → normalize → merge → confidence → project → validate
```

1. **Detect** — identify source type from extension and content
2. **Extract** — parse structured fields or regex-extract from notes
3. **Normalize** — E.164 phones, `YYYY-MM` dates, canonical skills, ISO country codes
4. **Merge** — combine facts; higher-confidence structured sources win conflicts
5. **Confidence** — weighted score across populated fields
6. **Project** — reshape canonical record per runtime config (optional)
7. **Validate** — Zod schema validation before output

The engine is UI-agnostic: `runPipeline(sources, config?)` in `src/pipeline/index.ts` takes in-memory `{ name, content }` sources and returns the canonical profile plus projected output, so it can be reused from any surface.

## Custom Output Config

```json
{
  "fields": [
    { "path": "full_name", "type": "string", "required": true },
    { "path": "primary_email", "from": "emails[0]", "type": "string", "required": true },
    { "path": "phone", "from": "phones[0]", "type": "string", "normalize": "E164" },
    { "path": "skills", "from": "skills[].name", "type": "string[]", "normalize": "canonical" }
  ],
  "include_confidence": true,
  "on_missing": "null"
}
```

Config options:
- `from` — remap from a canonical path (supports `emails[0]`, `skills[].name`)
- `normalize` — `E164`, `canonical`, `lowercase`
- `include_confidence` / `include_provenance` — toggle metadata
- `on_missing` — `null`, `omit`, or `error`

## Design Principles

- **Deterministic** — same inputs always produce the same output
- **Explainable** — every field traces to a source and extraction method
- **Robust** — missing or garbage data becomes `null`, never invented
- **Wrong-but-confident is worse than honestly-empty** — low confidence when normalization fails

## Project Structure

```
index.html            # Vite entry
src/
  ui/                 # React app (App.tsx, main.tsx, styles, sample data)
  pipeline/           # browser-safe engine: detect, extract, normalize, merge, confidence, project
  sources/            # CSV, ATS JSON, notes parsers
  schema/             # types and Zod validation
samples/              # example inputs and a custom config
tests/                # unit and e2e tests (vitest)
```

## Sample Data

Representative sample files live in `samples/` and are also embedded in the UI via the **Load sample data** button. Replace with official inputs as needed.

See [DESIGN.md](DESIGN.md) for the one-page technical design document.
