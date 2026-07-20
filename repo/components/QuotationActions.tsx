"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUOTE_STATUSES, ON_HOLD_STATUSES } from "@/lib/types";
import { statusLabel } from "@/lib/format";

export default function QuotationActions({
  id,
  status,
  holdNote,
}: {
  id: string;
  status: string;
  holdNote: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [note, setNote] = useState(holdNote ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHold = ON_HOLD_STATUSES.includes(current as any);

  async function save(nextStatus: string, nextNote?: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        hold_note: nextNote ?? note,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setCurrent(nextStatus);
      setMsg("Saved — timestamps updated automatically.");
      router.refresh();
    } else {
      setMsg("Update failed.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="label">Status</label>
          <select
            className="input"
            value={current}
            disabled={busy}
            onChange={(e) => save(e.target.value)}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {current !== "completed" && current !== "sent_to_customer" && (
          <button
            onClick={() => save("completed")}
            disabled={busy}
            className="btn-accent"
          >
            Mark Completed
          </button>
        )}
        {current === "completed" && (
          <button
            onClick={() => save("sent_to_customer")}
            disabled={busy}
            className="btn-primary"
          >
            Mark Sent to Customer
          </button>
        )}
      </div>

      {isHold && (
        <div>
          <label className="label">Hold reason / note</label>
          <div className="flex gap-2">
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Awaiting vendor pricing"
            />
            <button
              onClick={() => save(current, note)}
              disabled={busy}
              className="btn-secondary shrink-0"
            >
              Save note
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-slate-500">{msg}</p>}

      <p className="text-xs text-slate-400">
        Completion time is stamped automatically when status moves to Completed.
        Every change is written to the status history for turnaround reporting.
      </p>
    </div>
  );
}
