import type { ModelInfo } from "../types";
import { DATA_FETCHER_MODEL } from "../types";

export function ModelSelect({
  value,
  models,
  onChange,
}: {
  value: string;
  models: ModelInfo[];
  onChange: (v: string) => void;
}) {
  if (value === DATA_FETCHER_MODEL) {
    return (
      <span className="text-xs text-amber-300 bg-amber-950/40 px-2 py-1 rounded">
        data-fetcher (Stage 0)
      </span>
    );
  }
  const known = models.some((m) => m.id === value);
  return (
    <div className="flex gap-1 items-center">
      <input
        list="model-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs w-72 font-mono"
        placeholder="model id…"
      />
      <datalist id="model-list">
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </datalist>
      {!known && value && (
        <span className="text-[10px] text-amber-400" title="ei mallilistalla">
          ⚠ manuaalinen
        </span>
      )}
    </div>
  );
}
