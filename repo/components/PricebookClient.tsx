"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X, TrendingUp } from "lucide-react";
import { formatMYR, formatDate } from "@/lib/format";

type Entry = {
  id: string;
  product_id: string;
  vendor_name: string;
  vendor_type: "manufacturer" | "third_party";
  cost_price: number;
  effective_from: string;
  valid_until: string | null;
  notes: string | null;
  sell_price: number;
  margin: number;
  margin_pct: number | null;
  active: boolean;
  products?: { name: string; sku: string; unit_price: number; supplier: string | null };
};

type Product = { id: string; name: string; sku: string; unit_price: number; supplier: string | null };

export default function PricebookClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [productId, setProductId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState("third_party");
  const [costPrice, setCostPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pb, pr] = await Promise.all([
      fetch("/api/pricebook").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setEntries(pb.data ?? []);
    setProducts(pr.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!productId || !vendorName || !costPrice) {
      setError("Product, vendor and cost are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/pricebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        vendor_name: vendorName,
        vendor_type: vendorType,
        cost_price: Number(costPrice),
        effective_from: new Date(effectiveFrom).toISOString(),
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save.");
      return;
    }
    setShowForm(false);
    setProductId("");
    setVendorName("");
    setCostPrice("");
    setNotes("");
    setValidUntil("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this pricebook entry?")) return;
    await fetch(`/api/pricebook?id=${id}`, { method: "DELETE" });
    load();
  }

  const filtered = entries.filter((e) => {
    const needle = q.toLowerCase();
    const matches =
      !q ||
      e.products?.name?.toLowerCase().includes(needle) ||
      e.products?.sku?.toLowerCase().includes(needle) ||
      e.vendor_name.toLowerCase().includes(needle);
    if (!matches) return false;
    if (onlyActive && !e.active) return false;
    return true;
  });

  const selectedProduct = products.find((p) => p.id === productId);
  const previewMargin =
    selectedProduct && costPrice
      ? ((selectedProduct.unit_price - Number(costPrice)) /
          selectedProduct.unit_price) *
        100
      : null;

  const avgMargin =
    filtered.length > 0
      ? filtered.reduce((s, e) => s + (e.margin_pct ?? 0), 0) / filtered.length
      : 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pricebook</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vendor and manufacturer costs. Ops records each new or refreshed
            quote — margin flows straight into the dashboard.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-accent">
          {showForm ? (
            <>
              <X style={{ width: 16, height: 16 }} /> Cancel
            </>
          ) : (
            <>
              <Plus style={{ width: 16, height: 16 }} /> Record Vendor Quote
            </>
          )}
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase text-slate-500">
            Cost Entries
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {entries.length}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase text-slate-500">
            Products Priced
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {new Set(entries.map((e) => e.product_id)).size}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Avg Margin (shown)
              </p>
              <p className="mt-2 text-3xl font-bold text-arus-orange">
                {avgMargin.toFixed(1)}%
              </p>
            </div>
            <span className="rounded-lg bg-arus-orange/10 p-2.5 text-arus-orange">
              <TrendingUp style={{ width: 18, height: 18 }} />
            </span>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} className="card mb-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Record a vendor quote
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Product</label>
              <select
                className="input"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.sku}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Selling price</label>
              <input
                className="input bg-slate-50"
                disabled
                value={
                  selectedProduct ? formatMYR(selectedProduct.unit_price) : "—"
                }
              />
            </div>

            <div>
              <label className="label">Vendor / manufacturer</label>
              <input
                className="input"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. B.Braun"
              />
            </div>
            <div>
              <label className="label">Source type</label>
              <select
                className="input"
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
              >
                <option value="manufacturer">Main manufacturer</option>
                <option value="third_party">Third party</option>
              </select>
            </div>
            <div>
              <label className="label">Cost price (MYR)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="input"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
              {previewMargin !== null && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    previewMargin < 15 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  Margin at this cost: {previewMargin.toFixed(1)}%
                </p>
              )}
            </div>

            <div>
              <label className="label">Effective from</label>
              <input
                type="date"
                className="input"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Valid until (optional)</label>
              <input
                type="date"
                className="input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Q3 contract pricing"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save vendor quote"}
            </button>
          </div>
        </form>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            style={{ width: 15, height: 15 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-9"
            placeholder="Search product, SKU or vendor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          onClick={() => setOnlyActive(!onlyActive)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
            onlyActive
              ? "bg-arus-purple text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Active prices only
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Product</th>
              <th className="th">Vendor</th>
              <th className="th">Source</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Sell</th>
              <th className="th text-right">Margin</th>
              <th className="th">Effective</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <tr key={e.id} className={`hover:bg-slate-50 ${!e.active ? "opacity-50" : ""}`}>
                <td className="td">
                  <span className="font-medium text-slate-900">
                    {e.products?.name}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {e.products?.sku}
                  </span>
                </td>
                <td className="td">{e.vendor_name}</td>
                <td className="td">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.vendor_type === "manufacturer"
                        ? "bg-arus-purple/10 text-arus-purple"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {e.vendor_type === "manufacturer" ? "Manufacturer" : "3rd party"}
                  </span>
                </td>
                <td className="td whitespace-nowrap text-right">
                  {formatMYR(e.cost_price)}
                </td>
                <td className="td whitespace-nowrap text-right text-slate-500">
                  {formatMYR(e.sell_price)}
                </td>
                <td className="td whitespace-nowrap text-right">
                  <span
                    className={`font-semibold ${
                      (e.margin_pct ?? 0) < 15
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {e.margin_pct?.toFixed(1) ?? "—"}%
                  </span>
                  <span className="block text-xs text-slate-400">
                    {formatMYR(e.margin)}
                  </span>
                </td>
                <td className="td whitespace-nowrap text-xs text-slate-500">
                  {formatDate(e.effective_from)}
                  {e.valid_until && (
                    <span className="block">to {formatDate(e.valid_until)}</span>
                  )}
                </td>
                <td className="td text-right">
                  <button
                    onClick={() => remove(e.id)}
                    className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete entry"
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={8}>
                  {loading ? "Loading pricebook…" : "No entries match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Costs are effective-dated. When a PO line is raised, the cost in force at
        that moment is copied onto the line, so historical margin never shifts
        when you refresh a vendor price.
      </p>
    </div>
  );
}
