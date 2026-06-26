import { useState } from "react";
import { DATA_FETCHER_MODEL } from "../types";

const PRESETS = [
  {
    group: "Fast / Cheap",
    items: [
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "x-ai/grok-3-mini", label: "Grok 3 Mini" },
    ],
  },
  {
    group: "Balanced",
    items: [
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    ],
  },
  {
    group: "Powerful / Reasoning",
    items: [
      { id: "openai/o4-mini", label: "o4-mini (reasoning)" },
      { id: "anthropic/claude-opus-4-8", label: "Claude Opus 4.8" },
    ],
  },
];

const ALL_IDS = PRESETS.flatMap((g) => g.items.map((m) => m.id));

export function ModelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [custom, setCustom] = useState(!ALL_IDS.includes(value));

  if (value === DATA_FETCHER_MODEL) {
    return (
      <span className="text-xs text-amber-300 bg-amber-950/40 px-2 py-1 rounded">
        data-fetcher (Stage 0)
      </span>
    );
  }

  const isPreset = ALL_IDS.includes(value);

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
        {PRESETS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
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
    </div>
  );
}
