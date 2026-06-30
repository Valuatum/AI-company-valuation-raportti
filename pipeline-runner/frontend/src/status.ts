import type { StageResult, StageStatus } from "./types";

// A stage was auto-corrected if the runner flagged it, or (fallback) the
// "🔧 Automaattinen korjaus" entry is present in its validator checklist.
export const wasAutoCorrected = (r?: StageResult): boolean =>
  !!r?.validator_report?.auto_corrected ||
  (r?.validator_report?.checks || []).some((c) =>
    (c.name || "").includes("Automaattinen korjaus")
  );

export const STATUS_COLOR: Record<StageStatus, string> = {
  pending: "bg-neutral-600",
  running: "bg-sky-400 animate-pulse",
  ok: "bg-emerald-500",
  validation_failed: "bg-red-500",
  error: "bg-red-600",
  skipped: "bg-neutral-700",
};

export const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "odottaa",
  running: "ajossa",
  ok: "ok",
  validation_failed: "validointi failasi",
  error: "virhe",
  skipped: "ohitettu",
};
