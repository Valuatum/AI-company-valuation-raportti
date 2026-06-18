import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { ModelInfo, Stage } from "../types";
import { DATA_FETCHER_MODEL } from "../types";
import { ModelSelect } from "./ModelSelect";

const WELL_KNOWN: Record<number, string> = {
  0: "input_data",
  1: "enrichment",
  2: "scoring",
  3: "sections_numeric",
  4: "sections_analysis",
  5: "summary",
};

function substitute(template: string, ctx: Record<string, any>) {
  const missing: string[] = [];
  const text = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    if (!(k in ctx)) {
      missing.push(k);
      return `{{${k}}}`;
    }
    const v = ctx[k];
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  });
  return { text, missing };
}

export function StageEditor({
  stage,
  models,
  context,
  inputData,
  onSave,
  onSetInputData,
  onFetch,
}: {
  stage: Stage;
  models: ModelInfo[];
  context: Record<string, any>;
  inputData: any;
  onSave: (s: Stage) => void;
  onSetInputData: (d: any) => void;
  onFetch: (identifier: string) => void;
}) {
  const [draft, setDraft] = useState<Stage>(stage);
  const [showValidator, setShowValidator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    setDraft(stage);
    firstLoad.current = true;
  }, [stage.id]);

  // debounced persistence
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const t = setTimeout(() => onSave(draft), 500);
    return () => clearTimeout(t);
  }, [draft]);

  const patch = (p: Partial<Stage>) => setDraft((d) => ({ ...d, ...p }));

  const isFetcher = draft.model === DATA_FETCHER_MODEL;
  const preview = useMemo(
    () => substitute(draft.prompt_template, context),
    [draft.prompt_template, context]
  );
  const mappingKeys = Object.keys(draft.input_mapping || {});
  const unavailable = mappingKeys.filter((k) => !(k in context));

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-3">
      <input
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-lg font-semibold"
      />

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-neutral-400">Malli</span>
          <ModelSelect
            value={draft.model}
            models={models}
            onChange={(v) => patch({ model: v })}
          />
        </label>
        {!isFetcher && (
          <>
            <label className="flex items-center gap-1">
              <span className="text-neutral-400">max_tokens</span>
              <input
                type="number"
                value={draft.max_tokens}
                onChange={(e) => patch({ max_tokens: +e.target.value })}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-24"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-neutral-400">temp</span>
              <input
                type="number"
                step="0.05"
                value={draft.temperature}
                onChange={(e) => patch({ temperature: +e.target.value })}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-20"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-neutral-400">reasoning</span>
              <select
                value={draft.reasoning_effort ?? ""}
                onChange={(e) =>
                  patch({ reasoning_effort: e.target.value || null })
                }
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1"
              >
                <option value="">–</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="xhigh">xhigh</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.expects_json}
                onChange={(e) => patch({ expects_json: e.target.checked })}
                className="accent-sky-500"
              />
              <span className="text-neutral-400">expects JSON</span>
            </label>
          </>
        )}
      </div>

      {isFetcher ? (
        <Stage0Fetcher
          inputData={inputData}
          onSetInputData={onSetInputData}
          onFetch={onFetch}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">prompt_template</span>
            <button
              onClick={() => setShowPreview((s) => !s)}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              {showPreview ? "piilota" : "näytä"} substituoitu prompti
            </button>
          </div>
          <div className="border border-neutral-700 rounded overflow-hidden">
            <Editor
              height="240px"
              theme="vs-dark"
              defaultLanguage="markdown"
              path={`prompt-${draft.id}`}
              value={draft.prompt_template}
              onChange={(v) => patch({ prompt_template: v ?? "" })}
              options={{ minimap: { enabled: false }, fontSize: 12, wordWrap: "on" }}
            />
          </div>

          {mappingKeys.length > 0 && (
            <div className="text-xs text-neutral-400">
              input_mapping:{" "}
              {mappingKeys.map((k) => (
                <span
                  key={k}
                  className={`font-mono mr-2 ${
                    k in context ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {`{{${k}}}`}
                </span>
              ))}
              {unavailable.length > 0 && (
                <span className="text-red-400">
                  ⚠ {unavailable.join(", ")} ei vielä saatavilla tässä järjestyksessä
                </span>
              )}
            </div>
          )}

          {showPreview && (
            <pre className="text-[11px] bg-neutral-900 border border-neutral-700 rounded p-2 max-h-64 overflow-auto whitespace-pre-wrap">
              {preview.missing.length > 0 && (
                <div className="text-red-400 mb-1">
                  puuttuu: {preview.missing.join(", ")}
                </div>
              )}
              {preview.text}
            </pre>
          )}
        </>
      )}

      <button
        onClick={() => setShowValidator((s) => !s)}
        className="text-xs text-left text-sky-400 hover:text-sky-300"
      >
        {showValidator ? "▾" : "▸"} validator_code{" "}
        {draft.validator_code ? "(määritelty)" : "(ei validaattoria)"}
      </button>
      {showValidator && (
        <div className="border border-neutral-700 rounded overflow-hidden">
          <Editor
            height="300px"
            theme="vs-dark"
            defaultLanguage="python"
            path={`validator-${draft.id}`}
            value={draft.validator_code ?? ""}
            onChange={(v) => patch({ validator_code: v ?? null })}
            options={{ minimap: { enabled: false }, fontSize: 12 }}
          />
        </div>
      )}
    </div>
  );
}

function Stage0Fetcher({
  inputData,
  onSetInputData,
  onFetch,
}: {
  inputData: any;
  onSetInputData: (d: any) => void;
  onFetch: (id: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [text, setText] = useState(
    inputData ? JSON.stringify(inputData, null, 2) : ""
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setText(inputData ? JSON.stringify(inputData, null, 2) : "");
  }, [inputData]);

  const apply = () => {
    try {
      const d = JSON.parse(text);
      setErr(null);
      onSetInputData(d);
    } catch (e: any) {
      setErr("JSON-virhe: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Y-tunnus tai nimi"
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm flex-1"
        />
        <button
          onClick={() => onFetch(identifier)}
          className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600"
        >
          Hae
        </button>
      </div>
      <div className="text-xs text-neutral-400">
        — tai liitä FAKTAT input_data JSON käsin:
      </div>
      <div className="border border-neutral-700 rounded overflow-hidden">
        <Editor
          height="320px"
          theme="vs-dark"
          defaultLanguage="json"
          value={text}
          onChange={(v) => setText(v ?? "")}
          options={{ minimap: { enabled: false }, fontSize: 12 }}
        />
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <button
        onClick={apply}
        className="self-start px-3 py-1 text-sm rounded bg-sky-700 hover:bg-sky-600"
      >
        Aseta input_data
      </button>
    </div>
  );
}
