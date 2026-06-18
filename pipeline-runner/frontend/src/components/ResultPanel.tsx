import { useState } from "react";
import Editor from "@monaco-editor/react";
import type { ModelInfo, Stage, StageResult } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../status";
import { ValidatorChecklist } from "./ValidatorChecklist";

export function ResultPanel({
  result,
  stage,
  models,
  busy,
  onRerun,
  onRerunFrom,
  onCompare,
}: {
  result: StageResult | undefined;
  stage: Stage;
  models: ModelInfo[];
  busy: boolean;
  onRerun: (order: number) => void;
  onRerunFrom: (order: number) => void;
  onCompare: (order: number, models: string[]) => void;
}) {
  const [tab, setTab] = useState<"raw" | "json">("json");
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpModels, setCmpModels] = useState("");

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`w-3 h-3 rounded-full ${
            result ? STATUS_COLOR[result.status] : "bg-neutral-700"
          }`}
        />
        <span className="font-semibold">
          {result ? STATUS_LABEL[result.status] : "ei ajettu"}
        </span>
        {result?.finish_reason && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              result.finish_reason === "length"
                ? "bg-red-900 text-red-200"
                : "bg-neutral-800 text-neutral-400"
            }`}
            title="finish_reason"
          >
            finish: {result.finish_reason}
            {result.finish_reason === "length" && " — nosta max_tokens"}
          </span>
        )}
        <div className="flex-1" />
        <button
          disabled={busy}
          onClick={() => onRerun(stage.order)}
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40"
        >
          ▶ aja vain tämä
        </button>
        <button
          disabled={busy}
          onClick={() => onRerunFrom(stage.order)}
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40"
        >
          ▶▶ aja tästä eteenpäin
        </button>
        <button
          onClick={() => setCmpOpen((o) => !o)}
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        >
          ⇄ vertaa malleja
        </button>
      </div>

      {cmpOpen && (
        <div className="flex gap-2 items-center text-xs bg-neutral-900 border border-neutral-700 rounded p-2">
          <input
            value={cmpModels}
            onChange={(e) => setCmpModels(e.target.value)}
            placeholder="malli-idt pilkulla: deepseek/...,anthropic/claude-sonnet-4.6"
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 flex-1 font-mono"
          />
          <button
            disabled={busy}
            onClick={() =>
              onCompare(
                stage.order,
                cmpModels.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            className="px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40"
          >
            aja vertailu
          </button>
        </div>
      )}

      {result?.error_message && (
        <div className="bg-red-950/50 border border-red-700 rounded p-2 text-xs text-red-200 whitespace-pre-wrap">
          {result.error_message}
        </div>
      )}

      {result && (
        <div className="flex gap-4 text-xs text-neutral-400">
          <span>prompt-tok: {result.tokens_prompt}</span>
          <span>compl-tok: {result.tokens_completion}</span>
          <span>kesto: {result.latency_ms} ms</span>
          <span className="text-emerald-300">
            ${result.cost_usd?.toFixed(5)}
          </span>
        </div>
      )}

      {result?.validator_report && (
        <ValidatorChecklist report={result.validator_report} />
      )}

      {result && (
        <>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setTab("json")}
              className={`px-2 py-1 rounded ${
                tab === "json" ? "bg-neutral-700" : "bg-neutral-850"
              }`}
            >
              parsed JSON
            </button>
            <button
              onClick={() => setTab("raw")}
              className={`px-2 py-1 rounded ${
                tab === "raw" ? "bg-neutral-700" : "bg-neutral-850"
              }`}
            >
              raw response
            </button>
          </div>
          <div className="border border-neutral-700 rounded overflow-hidden">
            <Editor
              height="320px"
              theme="vs-dark"
              language={tab === "json" ? "json" : "markdown"}
              value={
                tab === "json"
                  ? result.parsed_json
                    ? JSON.stringify(result.parsed_json, null, 2)
                    : "// ei jäsenneltyä JSONia"
                  : result.raw_response ?? ""
              }
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: "on",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
