"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatMYR } from "@/lib/format";

type Option = { id: string; label: string; unit_price?: number };
type Item = { product_id: string; quantity_ordered: number; unit_price: number };

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [quotes, setQuotes] = useState<Option[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [deliveryDue, setDeliveryDue] = useState("");
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<Item[]>([
    { product_id: "", quantity_ordered: 1, unit_price: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, p, q] = await Promise.all([
          fetch("/api/customers").then((x) => x.json()),
          fetch("/api/products").then((x) => x.json()),
          fetch("/api/quotations").then((x) => x.json()),
        ]);
        setCustomers(
          (c.data ?? []).map((x: any) => ({
            id: x.id,
            label: x.hospital_name ?? x.name,
          }))
        );
        setProducts(
          (p.data ?? []).map((x: any) => ({
            id: x.id,
            label: `${x.name} — ${x.sku}`,
            unit_price: Number(x.unit_price),
          }))
        );
        setQuotes(
          (q.data ?? []).map((x: any) => ({
            id: x.id,
            label: `${x.quote_number} — ${
              x.customers?.hospital_name ?? "customer"
            }`,
          }))
        );
      } catch {
        setError("Failed to load form data.");
      }
    }
    load();
  }, []);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }

  function onProductChange(idx: number, productId: string) {
    const prod = products.find((p) => p.id === productId);
    updateItem(idx, { product_id: productId, unit_price: prod?.unit_price ?? 0 });
  }

  const total = items.reduce(
    (s, it) => s + it.quantity_ordered * it.unit_price,
    0
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    const valid = items.filter(
      (it) => it.product_id && it.quantity_ordered > 0
    );
    if (valid.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        quotation_id: quotationId || null,
        po_number: poNumber || undefined,
        delivery_due: deliveryDue || null,
        status,
        items: valid,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to create purchase order.");
      return;
    }
    router.push(`/purchase-orders/${json.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/purchase-orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Back to purchase orders
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Record a PO received from a customer. Cost is captured against each line
        automatically from the pricebook, so margin is tracked from day one.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Customer</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Against quote (optional)</label>
            <select
              className="input"
              value={quotationId}
              onChange={(e) => setQuotationId(e.target.value)}
            >
              <option value="">Not linked to a quote</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">PO number</label>
            <input
              className="input"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Auto-generated if left blank"
            />
          </div>
          <div>
            <label className="label">Delivery due</label>
            <input
              type="date"
              className="input"
              value={deliveryDue}
              onChange={(e) => setDeliveryDue(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="partial">Partial</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
            <button
              type="button"
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { product_id: "", quantity_ordered: 1, unit_price: 0 },
                ])
              }
              className="btn-secondary"
            >
              <Plus style={{ width: 15, height: 15 }} /> Add item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-100 p-3"
              >
                <div className="col-span-12 sm:col-span-6">
                  <label className="label">Product</label>
                  <select
                    className="input"
                    value={it.product_id}
                    onChange={(e) => onProductChange(idx, e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label">Qty</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={it.quantity_ordered}
                    onChange={(e) =>
                      updateItem(idx, {
                        quantity_ordered: parseInt(e.target.value || "0", 10),
                      })
                    }
                  />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <label className="label">Unit Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input"
                    value={it.unit_price}
                    onChange={(e) =>
                      updateItem(idx, {
                        unit_price: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </div>
                <div className="col-span-3 flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => p.filter((_, i) => i !== idx))
                    }
                    className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove item"
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900">
            <span>PO Total</span>
            <span>{formatMYR(total)}</span>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/purchase-orders" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-accent">
            {saving ? "Saving…" : "Create Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
