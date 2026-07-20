"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  PackageX,
  TrendingDown,
  X,
  Boxes,
  Search,
  Plus,
  Check,
  Pencil,
} from "lucide-react";
import { formatMYR } from "@/lib/format";

type Row = {
  id: string;
  sku: string;
  name: string;
  supplier: string | null;
  unit_price: number;
  qty_on_hand: number;
  reorder_point: number;
  reserved: number;
  available: number;
  flags: any[];
  needs_refresh: boolean;
  low_stock: boolean;
  out_of_stock: boolean;
};

export default function InventoryClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"all" | "alerts">("all");
  const [error, setError] = useState<string | null>(null);

  // inline stock editing
  const [editing, setEditing] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editReorder, setEditReorder] = useState("");

  // add product
  const [showAdd, setShowAdd] = useState(false);
  const [np, setNp] = useState({
    sku: "",
    name: "",
    supplier: "",
    unit_price: "",
    qty_on_hand: "",
    reorder_point: "10",
    vendor_name: "",
    cost_price: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory");
    const json = await res.json();
    setRows(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss(flagId: string) {
    await fetch(`/api/inventory/flags/${flagId}`, { method: "PATCH" });
    load();
  }

  function startEdit(r: Row) {
    setEditing(r.id);
    setEditQty(String(r.qty_on_hand));
    setEditReorder(String(r.reorder_point));
  }

  async function saveStock(productId: string) {
    await fetch("/api/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        qty_on_hand: Number(editQty),
        reorder_point: Number(editReorder),
      }),
    });
    setEditing(null);
    load();
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!np.sku || !np.name) {
      setError("SKU and product name are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: np.sku,
        name: np.name,
        supplier: np.supplier || null,
        unit_price: Number(np.unit_price || 0),
        qty_on_hand: Number(np.qty_on_hand || 0),
        reorder_point: Number(np.reorder_point || 10),
        vendor_name: np.vendor_name || np.supplier,
        cost_price: np.cost_price ? Number(np.cost_price) : null,
        vendor_type: "manufacturer",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to add product.");
      return;
    }
    setShowAdd(false);
    setNp({
      sku: "",
      name: "",
      supplier: "",
      unit_price: "",
      qty_on_hand: "",
      reorder_point: "10",
      vendor_name: "",
      cost_price: "",
    });
    load();
  }

  const allFlags = rows.flatMap((r) =>
    r.flags.map((f) => ({ ...f, product: r.name }))
  );
  const refreshFlags = allFlags.filter(
    (f) => f.flag_type === "stock_refresh_required"
  );
  const outboundFlags = allFlags.filter(
    (f) => f.flag_type === "potential_outbound"
  );

  const filtered = rows.filter((r) => {
    const matches =
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.sku.toLowerCase().includes(q.toLowerCase());
    if (!matches) return false;
    if (view === "alerts")
      return r.needs_refresh || r.low_stock || r.out_of_stock;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stock levels, reorder alerts and quote-driven reservations
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          {showAdd ? (
            <>
              <X style={{ width: 16, height: 16 }} /> Cancel
            </>
          ) : (
            <>
              <Plus style={{ width: 16, height: 16 }} /> Add Product
            </>
          )}
        </button>
      </div>

      {/* Add product */}
      {showAdd && (
        <form onSubmit={addProduct} className="card mb-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Add a new product
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="label">SKU</label>
              <input
                className="input"
                value={np.sku}
                onChange={(e) => setNp({ ...np, sku: e.target.value })}
                placeholder="MD-1025"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Product name</label>
              <input
                className="input"
                value={np.name}
                onChange={(e) => setNp({ ...np, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input
                className="input"
                value={np.supplier}
                onChange={(e) => setNp({ ...np, supplier: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Selling price</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={np.unit_price}
                onChange={(e) => setNp({ ...np, unit_price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Opening stock</label>
              <input
                type="number"
                className="input"
                value={np.qty_on_hand}
                onChange={(e) => setNp({ ...np, qty_on_hand: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Reorder point</label>
              <input
                type="number"
                className="input"
                value={np.reorder_point}
                onChange={(e) =>
                  setNp({ ...np, reorder_point: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Vendor cost (optional)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={np.cost_price}
                onChange={(e) => setNp({ ...np, cost_price: e.target.value })}
                placeholder="Adds to pricebook"
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
              {saving ? "Adding…" : "Add product"}
            </button>
          </div>
        </form>
      )}

      {/* Alert summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Stock Refresh Required
              </p>
              <p className="mt-2 text-3xl font-bold text-rose-600">
                {refreshFlags.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Quotes exceeding stock on hand
              </p>
            </div>
            <span className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <AlertTriangle style={{ width: 18, height: 18 }} />
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Potential to Leave
              </p>
              <p className="mt-2 text-3xl font-bold text-arus-orange">
                {outboundFlags.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Reserved against completed quotes
              </p>
            </div>
            <span className="rounded-lg bg-arus-orange/10 p-2.5 text-arus-orange">
              <TrendingDown style={{ width: 18, height: 18 }} />
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Out of Stock
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {rows.filter((r) => r.out_of_stock).length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {rows.filter((r) => r.low_stock).length} more below reorder point
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
              <PackageX style={{ width: 18, height: 18 }} />
            </span>
          </div>
        </div>
      </div>

      {/* Active flags */}
      {allFlags.length > 0 && (
        <div className="card mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Active Flags
            <span className="ml-2 text-xs font-normal text-slate-500">
              Ops can clear any flag once actioned
            </span>
          </h3>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {allFlags.map((f) => (
              <div
                key={f.id}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                  f.flag_type === "stock_refresh_required"
                    ? "border-rose-200 bg-rose-50"
                    : "border-orange-200 bg-orange-50"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm ${
                      f.flag_type === "stock_refresh_required"
                        ? "text-rose-800"
                        : "text-orange-900"
                    }`}
                  >
                    {f.message}
                  </p>
                  {f.qty_short > 0 && (
                    <p className="mt-0.5 text-xs font-medium text-rose-700">
                      Short by {f.qty_short} units
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(f.id)}
                  title="Clear flag"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            style={{ width: 15, height: 15 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-9"
            placeholder="Search product or SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "alerts"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                view === v
                  ? "bg-arus-purple text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {v === "all" ? "All products" : "Needs attention"}
            </button>
          ))}
        </div>
      </div>

      {/* Stock table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Product</th>
              <th className="th">SKU</th>
              <th className="th">On Hand</th>
              <th className="th">Reserved</th>
              <th className="th">Available</th>
              <th className="th">Reorder At</th>
              <th className="th">Status</th>
              <th className="th text-right">Unit Price</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const isEditing = editing === r.id;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td font-medium text-slate-900">{r.name}</td>
                  <td className="td text-slate-500">{r.sku}</td>
                  <td className="td">
                    {isEditing ? (
                      <input
                        type="number"
                        className="input w-24 py-1"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    ) : (
                      <span className="font-semibold">{r.qty_on_hand}</span>
                    )}
                  </td>
                  <td className="td">
                    {r.reserved > 0 ? (
                      <span className="text-arus-orange">{r.reserved}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="td">
                    <span
                      className={
                        r.available < 0 ? "font-semibold text-rose-600" : ""
                      }
                    >
                      {r.available}
                    </span>
                  </td>
                  <td className="td text-slate-500">
                    {isEditing ? (
                      <input
                        type="number"
                        className="input w-20 py-1"
                        value={editReorder}
                        onChange={(e) => setEditReorder(e.target.value)}
                      />
                    ) : (
                      r.reorder_point
                    )}
                  </td>
                  <td className="td">
                    {r.out_of_stock ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                        Out of stock
                      </span>
                    ) : r.needs_refresh ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                        Refresh required
                      </span>
                    ) : r.low_stock ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        In stock
                      </span>
                    )}
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    {formatMYR(r.unit_price)}
                  </td>
                  <td className="td text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => saveStock(r.id)}
                          className="rounded-md p-2 text-emerald-600 hover:bg-emerald-50"
                          title="Save"
                        >
                          <Check style={{ width: 15, height: 15 }} />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                          title="Cancel"
                        >
                          <X style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-arus-purple"
                        title="Update stock"
                      >
                        <Pencil style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={9}>
                  {loading ? "Loading inventory…" : "No products match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Boxes style={{ width: 13, height: 13 }} />
        Stock deducts automatically when a purchase order is marked delivered.
      </p>
    </div>
  );
}
