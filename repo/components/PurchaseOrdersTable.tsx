"use client";

import Link from "next/link";
import { formatMYR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { useSort } from "@/lib/useSort";
import SortableTh from "@/components/SortableTh";

export default function PurchaseOrdersTable({ rows }: { rows: any[] }) {
  const prepared = rows.map((p) => ({
    ...p,
    _cust: p.customers?.hospital_name ?? p.customers?.name ?? "",
    _due: p.delivery_due ? new Date(p.delivery_due).getTime() : Number.POSITIVE_INFINITY,
    _raised: p.created_at ? new Date(p.created_at).getTime() : 0,
  }));
  const { sorted, sortKey, dir, toggle } = useSort(prepared, "_due", "asc");

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <SortableTh label="PO #" sortKey="po_number" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Customer" sortKey="_cust" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Amount" sortKey="total_amount" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
            <SortableTh label="Status" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Raised" sortKey="_raised" activeKey={sortKey} dir={dir} onSort={toggle} />
            <SortableTh label="Due Date" sortKey="_due" activeKey={sortKey} dir={dir} onSort={toggle} />
            <th className="th"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="td whitespace-nowrap font-medium text-slate-900">{p.po_number}</td>
              <td className="td">
                {p.customers?.hospital_name ?? p.customers?.name ?? "—"}
              </td>
              <td className="td whitespace-nowrap text-right font-medium">
                {formatMYR(p.total_amount)}
              </td>
              <td className="td">
                <StatusBadge status={p.status} />
              </td>
              <td className="td whitespace-nowrap">{formatDate(p.created_at)}</td>
              <td className="td whitespace-nowrap">{formatDate(p.delivery_due)}</td>
              <td className="td text-right">
                <Link href={`/purchase-orders/${p.id}`} className="font-medium text-arus-purple hover:underline">
                  View more
                </Link>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td className="td text-slate-400" colSpan={7}>
                No purchase orders match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
