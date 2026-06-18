import { useState } from "react";
import type { ValidatorReport } from "../types";

export function ValidatorChecklist({ report }: { report: ValidatorReport }) {
  return (
    <div
      className={`rounded border p-2 ${
        report.passed
          ? "border-emerald-700 bg-emerald-950/30"
          : "border-red-600 bg-red-950/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">
          {report.passed ? "✓ Validaattori läpäisi" : "✗ Validaattori failasi"}
        </span>
        <span className="text-xs text-neutral-400">
          {report.checks.filter((c) => c.passed).length}/{report.checks.length}
        </span>
      </div>
      <ul className="space-y-1">
        {report.checks.map((c, i) => (
          <Check key={i} name={c.name} passed={c.passed} detail={c.detail} />
        ))}
      </ul>
    </div>
  );
}

function Check({
  name,
  passed,
  detail,
}: {
  name: string;
  passed: boolean;
  detail: string;
}) {
  const [open, setOpen] = useState(!passed);
  return (
    <li className="text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex gap-2 items-start text-left w-full"
      >
        <span className={passed ? "text-emerald-400" : "text-red-400"}>
          {passed ? "✓" : "✗"}
        </span>
        <span className={passed ? "text-neutral-300" : "text-red-200 font-medium"}>
          {name}
        </span>
      </button>
      {open && detail && (
        <div className="ml-5 mt-0.5 text-neutral-400 font-mono whitespace-pre-wrap break-words">
          {detail}
        </div>
      )}
    </li>
  );
}
