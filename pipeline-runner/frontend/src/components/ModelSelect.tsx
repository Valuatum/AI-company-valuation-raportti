import { useState } from "react";
import { DATA_FETCHER_MODEL } from "../types";
import type { ModelInfo } from "../types";
import {
  MODEL_GROUPS,
  PRESET_IDS,
  modelPrice,
  fmtUsd,
  priceText,
} from "../modelPresets";

export function ModelSelect({
  value,
  models,
  onChange,
}: {
  value: string;
  models?: ModelInfo[];
  onChange: (v: string) => void;
}) {
  const [custom, setCustom] = useState(!PRESET_IDS.includes(value));

  if (value === DATA_FETCHER_MODEL) {
    return (
      <span className="text-xs text-amber-300 bg-amber-950/40 px-2 py-1 rounded">
        data-fetcher (Stage 0)
      </span>
    );
  }

  const isPreset = PRESET_IDS.includes(value);
  const sel = modelPrice(models, value);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === "__custom__") {
      setCustom(true);
    } else {
      setCustom(false);
      onChange(v);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={isPreset && !custom ? value : "__custom__"}
        onChange={handleSelect}
        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs"
      >
        {MODEL_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((m) => {
              const pt = priceText(models, m.id);
              return (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {pt ? `  —  ${pt}` : ""}
                </option>
              );
            })}
          </optgroup>
        ))}
        <optgroup label="──────────">
          <option value="__custom__">Custom (type ID…)</option>
        </optgroup>
      </select>
      {(custom || !isPreset) && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="openrouter model id"
          spellCheck={false}
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono w-64"
        />
      )}
      {sel ? (
        <div className="text-[10px] text-emerald-400/90">
          in {fmtUsd(sel.inM)} · out {fmtUsd(sel.outM)} per 1M tokens
        </div>
      ) : (
        !isPreset && (
          <div className="text-[10px] text-neutral-500">
            price unknown (refresh models)
          </div>
        )
      )}
    </div>
  );
}
