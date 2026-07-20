import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMYR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PoActions from "@/components/PoActions";
import type { PurchaseOrder, PoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, total_amount, delivery_due, delivered_at, created_at, customers(name, hospital_name)"
    )
    .eq("id", id)
    .single();

  if (!po) notFound();
  const p = po as unknown as PurchaseOrder;

  const { data: itemData } = await supabase
    .from("po_items")
    .select(
      "id, quantity_ordered, quantity_delivered, unit_price, products(name, sku)"
    )
    .eq("po_id", id);
  const items = (itemData as unknown as PoItem[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/purchase-orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to purchase orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{p.po_number}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Created {formatDate(p.created_at)}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-400">Customer</p>
          <p className="font-medium text-slate-800">
            {p.customers?.hospital_name ?? p.customers?.name ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Delivery Due</p>
          <p className="font-medium text-slate-800">
            {formatDate(p.delivery_due)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Delivered At</p>
          <p className="font-medium text-slate-800">
            {formatDate(p.delivered_at)}
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold text-slate-800">Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="th">Product</th>
                <th className="th">Ordered</th>
                <th className="th">Delivered</th>
                <th className="th">Unit Price</th>
                <th className="th text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="td">{it.products?.name ?? "—"}</td>
                  <td className="td">{it.quantity_ordered}</td>
                  <td className="td">{it.quantity_delivered}</td>
                  <td className="td">{formatMYR(it.unit_price)}</td>
                  <td className="td text-right">
                    {formatMYR(it.quantity_ordered * it.unit_price)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="td text-slate-400" colSpan={5}>
                    No items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900">
          <span>Total</span>
          <span>{formatMYR(p.total_amount)}</span>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">Actions</h2>
        <PoActions id={p.id} status={p.status} />
      </div>
    </div>
  );
}
