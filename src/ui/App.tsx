import { useMemo, useState } from "react";
import { runPipeline, parseConfig, type InputSource } from "../pipeline/index.js";
import { detectSource } from "../pipeline/detect.js";
import type { PipelineResult } from "../pipeline/index.js";
import { SAMPLE_SOURCES, SAMPLE_CONFIG } from "./samples.js";

interface LoadedSource extends InputSource {
  id: string;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `src-${idCounter}`;
}

const TYPE_LABELS: Record<string, string> = {
  recruiter_csv: "Recruiter CSV (structured)",
  ats_json: "ATS JSON (structured)",
  recruiter_notes: "Recruiter notes (unstructured)",
  unknown: "Unrecognized",
};

export function App() {
  const [sources, setSources] = useState<LoadedSource[]>([]);
  const [useConfig, setUseConfig] = useState(false);
  const [configText, setConfigText] = useState(SAMPLE_CONFIG);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outputJson = useMemo(
    () => (result ? JSON.stringify(result.output, null, 2) : ""),
    [result]
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const loaded: LoadedSource[] = [];
    for (const file of Array.from(fileList)) {
      const content = await file.text();
      loaded.push({ id: nextId(), name: file.name, content });
    }
    setSources((prev) => [...prev, ...loaded]);
  }

  function loadSamples() {
    setSources(SAMPLE_SOURCES.map((s) => ({ ...s, id: nextId() })));
    setError(null);
    setResult(null);
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  function clearAll() {
    setSources([]);
    setResult(null);
    setError(null);
  }

  function transform() {
    setError(null);
    setResult(null);
    if (sources.length === 0) {
      setError("Add at least one source file (or load the sample data).");
      return;
    }
    try {
      const config = useConfig ? parseConfig(configText) : undefined;
      const inputs: InputSource[] = sources.map((s) => ({
        name: s.name,
        content: s.content,
      }));
      setResult(runPipeline(inputs, config));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function downloadJson() {
    if (!outputJson) return;
    const blob = new Blob([outputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = useConfig ? "custom.json" : "default.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Eightfold Candidate Transformer</h1>
        <p className="subtitle">
          Merge messy multi-source candidate data into one canonical, explainable
          profile. Everything runs locally in your browser.
        </p>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-head">
            <h2>1. Sources</h2>
            <div className="panel-actions">
              <button className="btn ghost" onClick={loadSamples} type="button">
                Load sample data
              </button>
              {sources.length > 0 && (
                <button className="btn ghost" onClick={clearAll} type="button">
                  Clear
                </button>
              )}
            </div>
          </div>

          <label className="dropzone">
            <input
              type="file"
              multiple
              accept=".csv,.json,.txt"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <span>Click to add files (.csv, .json, .txt)</span>
          </label>

          {sources.length > 0 && (
            <ul className="source-list">
              {sources.map((s) => {
                const detected = detectSource({ name: s.name, content: s.content });
                return (
                  <li key={s.id} className="source-item">
                    <div>
                      <span className="source-name">{s.name}</span>
                      <span
                        className={`badge ${
                          detected.sourceType === "unknown" ? "badge-warn" : ""
                        }`}
                      >
                        {TYPE_LABELS[detected.sourceType]}
                      </span>
                    </div>
                    <button
                      className="btn-x"
                      onClick={() => removeSource(s.id)}
                      type="button"
                      aria-label={`Remove ${s.name}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>2. Output config</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={useConfig}
                onChange={(e) => setUseConfig(e.target.checked)}
              />
              Custom projection
            </label>
          </div>

          {useConfig ? (
            <textarea
              className="config-input"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <p className="hint">
              Using the default schema — emits the full canonical profile with
              provenance and confidence.
            </p>
          )}

          <button className="btn primary" onClick={transform} type="button">
            Transform
          </button>
        </section>
      </main>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <section className="results">
          <div className="result-head">
            <h2>Result</h2>
            <button className="btn ghost" onClick={downloadJson} type="button">
              Download JSON
            </button>
          </div>

          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">Candidate ID</span>
              <span className="stat-value">{result.canonical.candidate_id}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Name</span>
              <span className="stat-value">
                {result.canonical.full_name ?? "—"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Confidence</span>
              <span className="stat-value">
                {(result.canonical.overall_confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Skills</span>
              <span className="stat-value">{result.canonical.skills.length}</span>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="alert warn">
              <strong>Warnings</strong>
              <ul>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <pre className="json-output">{outputJson}</pre>
        </section>
      )}

      <footer className="footer">
        Deterministic · explainable · robust — wrong-but-confident is worse than
        honestly empty.
      </footer>
    </div>
  );
}
