"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatMYR } from "@/lib/format";

type Option = { id: string; label: string; unit_price?: number };
type Item = { product_id: string; quantity: number; unit_price: number };

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CreateQuoteRequestPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Option[]>([]);
  const [reps, setReps] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [repId, setRepId] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow());
  const [externalRef, setExternalRef] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<Item[]>([
    { product_id: "", quantity: 1, unit_price: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, r, p] = await Promise.all([
          fetch("/api/customers").then((x) => x.json()),
          fetch("/api/sales-reps").then((x) => x.json()),
          fetch("/api/products").then((x) => x.json()),
        ]);
        setCustomers(
          (c.data ?? []).map((x: any) => ({
            id: x.id,
            label: x.hospital_name ?? x.name,
          }))
        );
        setReps(
          (r.data ?? []).map((x: any) => ({
            id: x.id,
            label: `${x.name} (${x.code})`,
          }))
        );
        setProducts(
          (p.data ?? []).map((x: any) => ({
            id: x.id,
            label: `${x.name} — ${x.sku}`,
            unit_price: Number(x.unit_price),
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

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId || !repId) {
      setError("Please select a customer and the requesting sales rep.");
      return;
    }
    const validItems = items.filter((it) => it.product_id && it.quantity > 0);

    setSaving(true);
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        sales_rep_id: repId,
        discount_pct: discount,
        received_at: new Date(receivedAt).toISOString(),
        external_ref: externalRef || null,
        items: validItems,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to save request.");
      return;
    }
    router.push(`/quotations/${json.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/quotations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Back to quote requests
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">New Quote Request</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Log a request received from a sales rep or director. The quote document
        itself is produced in your quoting system — this tracks the request and
        its turnaround.
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
            <label className="label">Requested by (Sales Rep)</label>
            <select
              className="input"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
            >
              <option value="">Select sales rep…</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date &amp; time received</label>
            <input
              type="datetime-local"
              className="input"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label">External quote ref (optional)</label>
            <input
              className="input"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="Ref from your quoting system"
            />
          </div>
        </div>

        <div className="card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Requested Items
            </h2>
            <button
              type="button"
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { product_id: "", quantity: 1, unit_price: 0 },
                ])
              }
              className="btn-secondary"
            >
              <Plus style={{ width: 15, height: 15 }} /> Add item
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Optional, but required for inventory reservation and product
            analytics.
          </p>

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
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, {
                        quantity: parseInt(e.target.value || "0", 10),
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
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Subtotal</span>
            <span className="font-medium">{formatMYR(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-500">Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              className="input w-28 text-right"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
            <span>Estimated Value</span>
            <span>{formatMYR(total)}</span>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/quotations" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-accent">
            {saving ? "Saving…" : "Save Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
