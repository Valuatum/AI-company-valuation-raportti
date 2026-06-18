import type { StageStatus } from "./types";

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
