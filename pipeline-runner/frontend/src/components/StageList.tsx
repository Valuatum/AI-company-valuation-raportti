import type { Pipeline, StageResult } from "../types";
import { STATUS_COLOR } from "../status";

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
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
        Vaiheet
      </div>
      <div className="flex-1 overflow-auto">
        {pipeline.stages.map((s) => {
          const res = results[s.order];
          const sel = s.id === selectedId;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`px-3 py-2 cursor-pointer border-l-2 ${
                sel
                  ? "bg-neutral-800 border-sky-500"
                  : "border-transparent hover:bg-neutral-850"
              } ${s.enabled ? "" : "opacity-50"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    res ? STATUS_COLOR[res.status] : "bg-neutral-700"
                  }`}
                />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <span className="text-[10px] text-neutral-500">#{s.order}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-4.5">
                <span className="text-[10px] text-neutral-500 font-mono truncate flex-1">
                  {s.model}
                </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(s.id, -1);
                      }}
                      className="text-neutral-500 hover:text-neutral-200 text-xs"
                      title="ylös"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(s.id, 1);
                      }}
                      className="text-neutral-500 hover:text-neutral-200 text-xs"
                      title="alas"
                    >
                      ▼
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Poista vaihe "${s.name}"?`)) onDelete(s.id);
                      }}
                      className="text-red-500/70 hover:text-red-400 text-xs"
                      title="poista"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onAdd}
        className="m-2 px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
      >
        + Lisää vaihe
      </button>
    </div>
  );
}
