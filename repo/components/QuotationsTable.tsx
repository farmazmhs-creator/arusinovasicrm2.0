"use client";

import Link from "next/link";
import { Paperclip } from "lucide-react";
import { formatMYR, turnaround } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { useSort } from "@/lib/useSort";
import SortableTh from "@/components/SortableTh";

export default function QuotationsTable({
  rows,
  hasDoc,
}: {
  rows: any[];
  hasDoc: string[];
}) {
  const docSet = new Set(hasDoc);
  // Derive flat, sort-friendly fields.
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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <SortableTh label="Quote #" sortKey="quote_number" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Customer" sortKey="_cust" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Requested By" sortKey="_rep" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Processed By" sortKey="_proc" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Quote Amount" sortKey="total_amount" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
            <SortableTh label="Status" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Turnaround" sortKey="_turn" activeKey={sortKey} dir={dir} onSort={toggle} />
            <th className="th"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
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
              <td className="td text-slate-400" colSpan={8}>
                No quote requests match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
