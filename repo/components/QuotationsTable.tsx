"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip, UserPlus, X } from "lucide-react";
import { formatMYR, turnaround } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { useSort } from "@/lib/useSort";
import SortableTh from "@/components/SortableTh";

type OpsUser = { id: string; name: string; role: string };

/** Received timestamp in Malaysia time (MYT / UTC+8). */
function fmtMYT(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function QuotationsTable({
  rows,
  hasDoc,
}: {
  rows: any[];
  hasDoc: string[];
}) {
  const router = useRouter();
  const docSet = new Set(hasDoc);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opsUsers, setOpsUsers] = useState<OpsUser[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/ops-users")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setOpsUsers(j.data ?? []))
      .catch(() => setOpsUsers([]));
  }, []);

  const prepared = rows.map((r) => ({
    ...r,
    _cust: r.customers?.hospital_name ?? "",
    _rep: r.sales_reps?.name ?? "",
    _proc: r.processed?.name ?? "",
    _turn: r.completed_at
      ? new Date(r.completed_at).getTime() - new Date(r.received_at).getTime()
      : Number.POSITIVE_INFINITY,
  }));
  const { sorted, sortKey, dir, toggle } = useSort(prepared, "received_at", "desc");

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function bulkAssign() {
    if (!selected.size) return;
    setBusy(true);
    const res = await fetch("/api/quotations/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: [...selected],
        processed_by: assignTo || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      setAssignTo("");
      router.refresh();
    }
  }

  const canAssign = opsUsers.length > 0;

  return (
    <div>
      {/* Bulk-assign bar */}
      {selected.size > 0 && canAssign && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-arus-purple/20 bg-arus-purple/5 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            {selected.size} selected
          </span>
          <span className="text-sm text-slate-500">Assign to Ops:</span>
          <select
            className="input h-9 w-auto py-1 text-sm"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
          >
            <option value="">Unassigned</option>
            {opsUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "director" ? " (Director)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={bulkAssign}
            disabled={busy}
            className="btn-primary h-9"
          >
            <UserPlus style={{ width: 15, height: 15 }} />
            {busy ? "Assigning…" : "Assign"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <X style={{ width: 14, height: 14 }} /> Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <SortableTh label="Quote #" sortKey="quote_number" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Customer" sortKey="_cust" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Requested By" sortKey="_rep" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Processed By" sortKey="_proc" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Received (MYT)" sortKey="received_at" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Quote Amount" sortKey="total_amount" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
              <SortableTh label="Status" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Turnaround" sortKey="_turn" activeKey={sortKey} dir={dir} onSort={toggle} />
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-slate-50 ${
                  selected.has(r.id) ? "bg-arus-purple/5" : ""
                }`}
              >
                <td className="td">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`Select ${r.quote_number}`}
                  />
                </td>
                <td className="td whitespace-nowrap font-medium text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    {r.quote_number}
                    {docSet.has(r.id) && (
                      <Paperclip style={{ width: 13, height: 13 }} className="text-arus-orange" />
                    )}
                  </span>
                </td>
                <td className="td">{r.customers?.hospital_name ?? "—"}</td>
                <td className="td">{r.sales_reps?.name ?? "—"}</td>
                <td className="td">
                  {r.processed?.name ?? <span className="text-slate-300">Unassigned</span>}
                </td>
                <td className="td whitespace-nowrap text-xs text-slate-600">
                  {fmtMYT(r.received_at)}
                </td>
                <td className="td whitespace-nowrap text-right font-medium">
                  {formatMYR(r.total_amount)}
                </td>
                <td className="td">
                  <StatusBadge status={r.status} />
                </td>
                <td className="td whitespace-nowrap">
                  {turnaround(r.received_at, r.completed_at)}
                </td>
                <td className="td whitespace-nowrap text-right">
                  <Link href={`/quotations/${r.id}`} className="font-medium text-arus-purple hover:underline">
                    View more
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={10}>
                  No quote requests match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
