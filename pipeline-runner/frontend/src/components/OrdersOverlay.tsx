import { useEffect, useState } from "react";
import { api } from "../api";

type Order = {
  id: string;
  company: string;
  email: string;
  user_input: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["open", "in_progress", "delivered", "spam"] as const;
const LABELS: Record<string, string> = {
  open: "avoin",
  in_progress: "työn alla",
  delivered: "toimitettu",
  spam: "roskaposti",
};

export function OrdersOverlay({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.orders().then(setOrders);
  }, []);

  async function setStatus(o: Order, status: string) {
    const updated = await api.setOrderStatus(o.id, status);
    setOrders((cur) => cur.map((x) => (x.id === o.id ? updated : x)));
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-8 z-50"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-[860px] max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">
            Tilaukset ({orders.filter((o) => o.status === "open").length} avointa)
          </span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>
        {orders.length === 0 && (
          <div className="text-sm text-neutral-500">Ei tilauksia.</div>
        )}
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-neutral-800 rounded p-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-100">{o.company}</span>
                <a href={`mailto:${o.email}`} className="text-sky-400 hover:underline">
                  {o.email}
                </a>
                <span className="text-xs text-neutral-500">
                  {o.created_at?.slice(0, 16).replace("T", " ")}
                </span>
                <div className="flex-1" />
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o, e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              {o.user_input && (
                <div className="mt-2 flex items-start gap-2">
                  <p className="flex-1 whitespace-pre-wrap text-neutral-300 text-xs bg-neutral-950 border border-neutral-800 rounded p-2">
                    {o.user_input}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(o.user_input || "")}
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                    title="Kopioi ajon Lisätiedot AI:lle -kenttään"
                  >
                    ⧉ Kopioi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
