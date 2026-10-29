"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionButton } from "@/lib/status";

export default function OrderActions({ orderId, actions }: { orderId: string; actions: ActionButton[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (actions.length === 0) return null;

  async function run(action: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Handlingen mislykkedes.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.action}
            disabled={busy}
            onClick={() => run(a.action)}
            className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 ${
              a.danger ? "bg-red-600" : "bg-rose-600"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
