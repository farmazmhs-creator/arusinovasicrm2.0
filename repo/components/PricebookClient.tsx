"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X, TrendingUp, Paperclip } from "lucide-react";
import { formatMYR, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useSort } from "@/lib/useSort";
import SortableTh from "@/components/SortableTh";

type Entry = {
  id: string;
  product_id: string;
  vendor_name: string;
  vendor_type: "manufacturer" | "third_party";
  cost_price: number;
  effective_from: string;
  valid_until: string | null;
  notes: string | null;
  ex_stock: boolean | null;
  est_delivery_on_payment: string | null;
  terms: string | null;
  moq: number | null;
  vendor_quote_name: string | null;
  quote_url: string | null;
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
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSell, setNewSell] = useState("");
  const [productId, setProductId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState("third_party");
  const [costPrice, setCostPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  // Vendor-quote detail
  const [exStock, setExStock] = useState(""); // "" | "yes" | "no"
  const [estDelivery, setEstDelivery] = useState("");
  const [terms, setTerms] = useState("");
  const [moq, setMoq] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

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

  function resetForm() {
    setShowForm(false);
    setIsNew(false);
    setNewName("");
    setNewSell("");
    setProductId("");
    setVendorName("");
    setCostPrice("");
    setNotes("");
    setValidUntil("");
    setExStock("");
    setEstDelivery("");
    setTerms("");
    setMoq("");
    setFile(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vendorName || !costPrice) {
      setError("Vendor and cost are required.");
      return;
    }

    setSaving(true);
    let res: Response;

    // Vendor-quote detail shared by both paths.
    const vendorDetail = {
      ex_stock: exStock === "" ? null : exStock === "yes",
      est_delivery_on_payment: estDelivery || null,
      terms: terms || null,
      moq: moq || null,
    };

    // Upload the vendor quotation document (works for new and existing products).
    let vendorQuotePath: string | null = null;
    let vendorQuoteName: string | null = null;
    if (file) {
      const key = isNew ? "new" : productId;
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `vendor-quotes/${key}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("quote-docs")
        .upload(path, file);
      if (upErr) {
        setSaving(false);
        setError("File upload failed: " + upErr.message);
        return;
      }
      vendorQuotePath = path;
      vendorQuoteName = file.name;
    }

    if (isNew) {
      // New product: one call creates the product, an inventory row (stock 0)
      // and this first vendor cost together.
      if (!newName.trim()) {
        setSaving(false);
        setError("Enter the new product's name.");
        return;
      }
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          unit_price: Number(newSell || 0),
          supplier: vendorName,
          vendor_name: vendorName,
          vendor_type: vendorType,
          cost_price: Number(costPrice),
          qty_on_hand: 0,
          reorder_point: 10,
          ...vendorDetail,
          vendor_quote_path: vendorQuotePath,
          vendor_quote_name: vendorQuoteName,
        }),
      });
    } else {
      if (!productId) {
        setSaving(false);
        setError("Pick a product, or switch to New product.");
        return;
      }
      res = await fetch("/api/pricebook", {
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
          ...vendorDetail,
          vendor_quote_path: vendorQuotePath,
          vendor_quote_name: vendorQuoteName,
        }),
      });
    }

    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save.");
      return;
    }
    resetForm();
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

  const { sorted, sortKey, dir, toggle } = useSort(filtered, "products.name");

  const selectedProduct = products.find((p) => p.id === productId);
  const sellForMargin = isNew
    ? Number(newSell || 0)
    : selectedProduct?.unit_price ?? 0;
  const previewMargin =
    sellForMargin && costPrice
      ? ((sellForMargin - Number(costPrice)) / sellForMargin) * 100
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
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="btn-accent"
        >
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Record a vendor quote
            </h2>
            {/* Existing vs brand-new product */}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { v: false, label: "Existing product" },
                { v: true, label: "New product" },
              ].map((t) => (
                <button
                  key={String(t.v)}
                  type="button"
                  onClick={() => setIsNew(t.v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    isNew === t.v
                      ? "bg-white text-arus-purple shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {isNew && (
            <p className="mb-4 rounded-lg bg-arus-purple/5 px-3 py-2 text-xs text-slate-600">
              This creates the product, adds it to inventory at zero stock, and
              records this cost as its first pricebook entry — all in one step. A
              product code is generated automatically.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Product</label>
              {isNew ? (
                <input
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New product name"
                />
              ) : (
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
              )}
            </div>
            <div>
              <label className="label">Selling price</label>
              {isNew ? (
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="input"
                  value={newSell}
                  onChange={(e) => setNewSell(e.target.value)}
                  placeholder="What you sell it for"
                />
              ) : (
                <input
                  className="input bg-slate-50"
                  disabled
                  value={
                    selectedProduct
                      ? formatMYR(selectedProduct.unit_price)
                      : "—"
                  }
                />
              )}
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

            {!isNew && (
              <>
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
              </>
            )}

            {/* Vendor-quote detail — applies to any quote */}
            <div>
              <label className="label">Ex-stock available?</label>
              <select
                className="input"
                value={exStock}
                onChange={(e) => setExStock(e.target.value)}
              >
                <option value="">—</option>
                <option value="yes">Yes — ready stock</option>
                <option value="no">No — indent order</option>
              </select>
            </div>
            <div>
              <label className="label">MOQ (min order qty)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className="label">Est. delivery upon payment</label>
              <input
                className="input"
                value={estDelivery}
                onChange={(e) => setEstDelivery(e.target.value)}
                placeholder="e.g. 2–3 weeks"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Terms &amp; conditions</label>
              <input
                className="input"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. 100% payment before delivery; quote valid 30 days"
              />
            </div>
            <div>
              <label className="label">Vendor quote (upload)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-arus-purple/10 file:px-3 file:py-1.5 file:text-arus-purple hover:file:bg-arus-purple/20"
              />
              {file && (
                <p className="mt-1 truncate text-xs text-slate-400">{file.name}</p>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? "Saving…"
                : isNew
                ? "Add product & cost"
                : "Save vendor quote"}
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
              <SortableTh label="Product" sortKey="products.name" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Vendor" sortKey="vendor_name" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Source" sortKey="vendor_type" activeKey={sortKey} dir={dir} onSort={toggle} />
              <SortableTh label="Cost" sortKey="cost_price" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
              <SortableTh label="Sell" sortKey="sell_price" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
              <SortableTh label="Margin" sortKey="margin_pct" activeKey={sortKey} dir={dir} onSort={toggle} align="right" />
              <SortableTh label="Effective" sortKey="effective_from" activeKey={sortKey} dir={dir} onSort={toggle} />
              <th className="th">Supply</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((e) => (
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
                <td className="td text-xs text-slate-500">
                  {e.ex_stock === true && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      Ex-stock
                    </span>
                  )}
                  {e.ex_stock === false && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                      Indent
                    </span>
                  )}
                  {e.moq != null && <span className="block">MOQ {e.moq}</span>}
                  {e.est_delivery_on_payment && (
                    <span className="block">{e.est_delivery_on_payment}</span>
                  )}
                  {e.terms && (
                    <span
                      className="block max-w-[160px] truncate"
                      title={e.terms}
                    >
                      {e.terms}
                    </span>
                  )}
                  {e.quote_url && (
                    <a
                      href={e.quote_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-arus-purple hover:underline"
                    >
                      <Paperclip style={{ width: 12, height: 12 }} />
                      {e.vendor_quote_name ? "Quote" : "Quote"}
                    </a>
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
                <td className="td text-slate-400" colSpan={9}>
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
