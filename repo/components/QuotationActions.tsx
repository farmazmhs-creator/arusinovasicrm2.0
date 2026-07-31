"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QUOTE_STATUSES, ON_HOLD_STATUSES } from "@/lib/types";
import { statusLabel } from "@/lib/format";

type OpsUser = { id: string; name: string; role: string };

export default function QuotationActions({
  id,
  status,
  holdNote,
  processedBy,
}: {
  id: string;
  status: string;
  holdNote: string | null;
  processedBy?: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [note, setNote] = useState(holdNote ?? "");
  const [assignee, setAssignee] = useState(processedBy ?? "");
  const [opsUsers, setOpsUsers] = useState<OpsUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHold = ON_HOLD_STATUSES.includes(current as any);

  useEffect(() => {
    fetch("/api/ops-users")
      .then((r) => r.json())
      .then((j) => setOpsUsers(j.data ?? []))
      .catch(() => setOpsUsers([]));
  }, []);

  async function put(patch: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (res.ok) {
      setMsg(okMsg);
      router.refresh();
    } else {
      setMsg("Update failed.");
    }
  }

  async function save(nextStatus: string, nextNote?: string) {
    await put(
      { status: nextStatus, hold_note: nextNote ?? note },
      "Saved — timestamps updated automatically."
    );
    setCurrent(nextStatus);
  }

  async function assign(userId: string) {
    setAssignee(userId);
    await put({ processed_by: userId || null }, "Owner updated.");
  }

  const terminal = current === "cancelled" || current === "closed";

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

        {/* Assign to an Ops person (Processed By) */}
        <div className="min-w-[220px]">
          <label className="label">Assigned to (Ops)</label>
          <select
            className="input"
            value={assignee}
            disabled={busy}
            onChange={(e) => assign(e.target.value)}
          >
            <option value="">Unassigned</option>
            {opsUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "director" ? " (Director)" : ""}
              </option>
            ))}
          </select>
        </div>

        {current !== "completed" &&
          current !== "sent_to_customer" &&
          !terminal && (
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
        {current === "cancelled" && (
          <button
            onClick={() => save("closed")}
            disabled={busy}
            className="btn-primary"
          >
            Mark Closed
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
