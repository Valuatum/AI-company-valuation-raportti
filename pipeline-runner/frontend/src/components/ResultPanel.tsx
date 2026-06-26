import { useState } from "react";
import Editor from "@monaco-editor/react";
import type { Stage, StageResult } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../status";
import { ValidatorChecklist } from "./ValidatorChecklist";

const COMPARE_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o4-mini",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-8",
  "x-ai/grok-3-mini",
];

export function ResultPanel({
  result,
  stage,
  busy,
  onRerun,
  onRerunFrom,
  onCompare,
}: {
  result: StageResult | undefined;
  stage: Stage;
  models: any[];
  busy: boolean;
  onRerun: (order: number) => void;
  onRerunFrom: (order: number) => void;
  onCompare: (order: number, models: string[]) => void;
}) {
  const [tab, setTab] = useState<"raw" | "json">("json");
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpSelected, setCmpSelected] = useState<string[]>([]);

  function toggleCmpModel(id: string) {
    setCmpSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  const statusColor = result ? STATUS_COLOR[result.status] : "bg-neutral-700";
  const statusLabel = result ? STATUS_LABEL[result.status] : "not run";

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-800 flex-wrap shrink-0">
        <span className={`w-3 h-3 rounded-full shrink-0 ${statusColor}`} />
        <span className="font-semibold text-sm">{statusLabel}</span>
        {result?.finish_reason && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              result.finish_reason === "length"
                ? "bg-red-900/60 text-red-200"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {result.finish_reason === "length" ? "⚠ length — raise max_tokens" : `finish: ${result.finish_reason}`}
          </span>
        )}
        <div className="flex-1" />
        <button
          disabled={busy}
          onClick={() => onRerun(stage.order)}
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40"
        >
          ▶ Run this stage
        </button>
        <button
          disabled={busy}
          onClick={() => onRerunFrom(stage.order)}
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40"
        >
          ▶▶ Run from here
        </button>
        <button
          onClick={() => setCmpOpen((o) => !o)}
          className={`text-xs px-2 py-1 rounded ${cmpOpen ? "bg-sky-800" : "bg-neutral-800 hover:bg-neutral-700"}`}
        >
          ⇄ Compare models
        </button>
      </div>

      {/* model comparison panel */}
      {cmpOpen && (
        <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-950 shrink-0">
          <div className="text-xs text-neutral-400 mb-2">Select models to compare:</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMPARE_MODELS.map((id) => (
              <button
                key={id}
                onClick={() => toggleCmpModel(id)}
                className={`text-xs px-2 py-1 rounded font-mono ${
                  cmpSelected.includes(id)
                    ? "bg-sky-700 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                {id.split("/")[1]}
              </button>
            ))}
          </div>
          <button
            disabled={busy || cmpSelected.length === 0}
            onClick={() => onCompare(stage.order, cmpSelected)}
            className="text-xs px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40"
          >
            Run comparison ({cmpSelected.length} selected)
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
        {/* error */}
        {result?.error_message && (
          <div className="bg-red-950/50 border border-red-700 rounded p-3 text-xs text-red-200 whitespace-pre-wrap font-mono">
            {result.error_message}
          </div>
        )}

        {/* stats */}
        {result && (
          <div className="flex gap-4 text-xs text-neutral-500 font-mono">
            <span>prompt: {result.tokens_prompt} tok</span>
            <span>completion: {result.tokens_completion} tok</span>
            <span>{result.latency_ms} ms</span>
            <span className="text-emerald-400">${result.cost_usd?.toFixed(5)}</span>
            {result.model && <span className="text-neutral-600">{result.model}</span>}
          </div>
        )}

        {/* validator */}
        {result?.validator_report && (
          <ValidatorChecklist report={result.validator_report} />
        )}

        {/* output tabs */}
        {result && (
          <>
            <div className="flex gap-1.5 text-xs">
              <button
                onClick={() => setTab("json")}
                className={`px-2 py-1 rounded ${tab === "json" ? "bg-neutral-700 text-white" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}
              >
                Parsed JSON
              </button>
              <button
                onClick={() => setTab("raw")}
                className={`px-2 py-1 rounded ${tab === "raw" ? "bg-neutral-700 text-white" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"}`}
              >
                Raw response
              </button>
            </div>
            <div className="border border-neutral-700 rounded overflow-hidden">
              <Editor
                height="380px"
                theme="vs-dark"
                language={tab === "json" ? "json" : "markdown"}
                value={
                  tab === "json"
                    ? result.parsed_json
                      ? JSON.stringify(result.parsed_json, null, 2)
                      : "// no parsed JSON"
                    : result.raw_response ?? ""
                }
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </>
        )}

        {!result && (
          <div className="text-xs text-neutral-600 italic pt-4">
            No output yet. Run this stage or the full pipeline.
          </div>
        )}
      </div>
    </div>
  );
}
