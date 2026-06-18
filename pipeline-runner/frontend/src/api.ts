import type { ModelInfo, Pipeline, Run, Stage, ValidatorReport } from "./types";

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

export const api = {
  pipelines: () => fetch("/api/pipelines").then((r) => j<Pipeline[]>(r)),
  pipeline: (id: string) => fetch(`/api/pipelines/${id}`).then((r) => j<Pipeline>(r)),

  updateStage: (sid: string, s: Stage) =>
    fetch(`/api/stages/${sid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).then((r) => j<Stage>(r)),

  addStage: (pid: string, s: Partial<Stage>) =>
    fetch(`/api/pipelines/${pid}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    }).then((r) => j<Stage>(r)),

  deleteStage: (sid: string) =>
    fetch(`/api/stages/${sid}`, { method: "DELETE" }).then((r) => j(r)),

  reorder: (pid: string, stage_ids: string[]) =>
    fetch(`/api/pipelines/${pid}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_ids }),
    }).then((r) => j<Pipeline>(r)),

  models: () => fetch("/api/models").then((r) => j<ModelInfo[]>(r)),
  refreshModels: () =>
    fetch("/api/models/refresh", { method: "POST" }).then((r) => j<ModelInfo[]>(r)),

  sampleInputData: () => fetch("/api/sample-input-data").then((r) => j<any>(r)),

  fetchCompany: (identifier: string, params: any = {}) =>
    fetch("/api/fetch-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, params }),
    }).then((r) => j<any>(r)),

  validate: (validator_code: string, output: any, context: any) =>
    fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validator_code, output, context }),
    }).then((r) => j<ValidatorReport>(r)),

  startRun: (body: {
    pipeline_id: string;
    input_data?: any;
    identifier?: string;
    stop_on_failure: boolean;
  }) =>
    fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => j<{ run_id: string }>(r)),

  runs: () => fetch("/api/runs").then((r) => j<any[]>(r)),
  run: (id: string) => fetch(`/api/runs/${id}`).then((r) => j<Run>(r)),

  costs: () =>
    fetch("/api/costs").then((r) =>
      j<{ grand_total_usd: number; by_model: any[]; runs: any[] }>(r)
    ),
  reportCapabilities: () =>
    fetch("/api/report-capabilities").then((r) =>
      j<{ generator: boolean; pdf: boolean }>(r)
    ),

  valuatumConfig: () =>
    fetch("/api/valuatum/config").then((r) =>
      j<{ token: boolean; profinder: boolean; kit: boolean }>(r)
    ),

  compare: (rid: string, order: number, models: string[]) =>
    fetch(`/api/runs/${rid}/stages/${order}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models }),
    }).then((r) => j<{ results: any[] }>(r)),
};

// SSE helpers — POST endpoints stream too, so we use fetch + ReadableStream.
export async function streamRun(
  url: string,
  method: "GET" | "POST",
  onEvent: (e: any) => void,
  body?: any
): Promise<void> {
  const resp = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.body) throw new Error("no stream body");
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (line) {
        try {
          onEvent(JSON.parse(line.slice(5).trim()));
        } catch {
          /* ignore keep-alive */
        }
      }
    }
  }
}
