import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMYR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import FilterTabs from "@/components/FilterTabs";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { status = "all", q, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, total_amount, delivery_due, created_at, customers(name, hospital_name)"
    )
    .order("delivery_due", { ascending: true, nullsFirst: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);

  if (q) {
    const { data: matches } = await supabase
      .from("customers")
      .select("id")
      .ilike("hospital_name", `%${q}%`);
    const ids = (matches ?? []).map((m) => m.id);
    const clauses = [`po_number.ilike.%${q}%`];
    if (ids.length) clauses.push(`customer_id.in.(${ids.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query;
  const rows = (data as any[]) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} record{rows.length === 1 ? "" : "s"} shown
          </p>
        </div>
        <Link href="/purchase-orders/create" className="btn-accent">
          <Plus style={{ width: 16, height: 16 }} /> New PO
        </Link>
      </div>

      <Suspense fallback={null}>
        <SearchBar
          basePath="/purchase-orders"
          placeholder="PO number or customer…"
        />
      </Suspense>

      <div className="mb-4">
        <FilterTabs
          basePath="/purchase-orders"
          current={status}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "received", label: "Received" },
            { value: "partial", label: "Partial" },
            { value: "delivered", label: "Delivered" },
          ]}
        />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">PO #</th>
              <th className="th">Customer</th>
              <th className="th text-right">Amount</th>
              <th className="th">Status</th>
              <th className="th">Raised</th>
              <th className="th">Due Date</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap font-medium text-slate-900">
                  {p.po_number}
                </td>
                <td className="td">
                  {p.customers?.hospital_name ?? p.customers?.name ?? "—"}
                </td>
                <td className="td whitespace-nowrap text-right font-medium">
                  {formatMYR(p.total_amount)}
                </td>
                <td className="td">
                  <StatusBadge status={p.status} />
                </td>
                <td className="td whitespace-nowrap">
                  {formatDate(p.created_at)}
                </td>
                <td className="td whitespace-nowrap">
                  {formatDate(p.delivery_due)}
                </td>
                <td className="td text-right">
                  <Link
                    href={`/purchase-orders/${p.id}`}
                    className="font-medium text-arus-purple hover:underline"
                  >
                    View more
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={7}>
                  No purchase orders match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
