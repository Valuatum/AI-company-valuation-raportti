import type { Pipeline, StageResult } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../status";

export function StageList({
  pipeline,
  selectedId,
  results,
  onSelect,
  onToggle,
  onAdd,
  onDelete,
  onMove,
}: {
  pipeline: Pipeline;
  selectedId: string | null;
  results: Record<number, StageResult>;
  onSelect: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-neutral-800">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Stages</div>
      </div>

      <div className="flex-1 overflow-auto">
        {pipeline.stages.map((s) => {
          const res = results[s.order];
          const sel = s.id === selectedId;
          const modelShort = s.model.includes("/") ? s.model.split("/")[1] : s.model;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                sel
                  ? "bg-neutral-800 border-sky-500"
                  : "border-transparent hover:bg-neutral-900"
              } ${s.enabled ? "" : "opacity-40"}`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                    res ? STATUS_COLOR[res.status] : "bg-neutral-700"
                  }`}
                  title={res ? STATUS_LABEL[res.status] : "not run"}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate leading-tight">{s.name}</div>
                  <div className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                    {s.model === "__data_fetcher__" ? "data fetcher" : modelShort}
                  </div>
                  {res?.cost_usd ? (
                    <div className="text-[10px] text-emerald-600 mt-0.5">
                      ${res.cost_usd.toFixed(5)}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggle(s.id, e.target.checked)}
                    title="enabled"
                    className="accent-sky-500"
                  />
                  {s.order !== 0 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, -1); }}
                        className="text-neutral-600 hover:text-neutral-300 text-xs"
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMove(s.id, 1); }}
                        className="text-neutral-600 hover:text-neutral-300 text-xs"
                        title="Move down"
                      >▼</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete stage "${s.name}"?`)) onDelete(s.id);
                        }}
                        className="text-red-700 hover:text-red-400 text-xs ml-0.5"
                        title="Delete"
                      >✕</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-neutral-800">
        <button
          onClick={onAdd}
          className="w-full px-2 py-1.5 text-xs rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-400"
        >
          + Add stage
        </button>
      </div>
    </div>
  );
}
