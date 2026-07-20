"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PO_STATUSES } from "@/lib/types";

export default function PoActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function update(next: string, markDelivered = false) {
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = { status: next };
    if (markDelivered) body.delivered_at = new Date().toISOString();
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setCurrent(next);
      setMsg("Saved.");
      router.refresh();
    } else {
      setMsg("Update failed.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-slate-500">Status</label>
      <select
        className="input w-40"
        value={current}
        disabled={busy}
        onChange={(e) => update(e.target.value)}
      >
        {PO_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        onClick={() => update("delivered", true)}
        disabled={busy}
        className="btn-primary"
      >
        Mark as Delivered
      </button>
      {msg && <span className="text-sm text-slate-500">{msg}</span>}
    </div>
  );
}
