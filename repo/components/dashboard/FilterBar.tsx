"use client";

import { SlidersHorizontal, RotateCcw } from "lucide-react";

export type Filters = {
  preset: string;
  from: string;
  to: string;
  rep: string;
  state: string;
  customer: string;
  product: string;
  supplier: string;
  compare: string;
};

export type FilterOptions = {
  customers: { id: string; hospital_name: string; state: string | null }[];
  reps: { id: string; name: string; code: string }[];
  products: { id: string; name: string; sku: string; supplier: string | null }[];
  states: string[];
  suppliers: string[];
};

export const PRESETS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "ytd", label: "Year to Date" },
  { value: "last_12m", label: "Last 12 Months" },
  { value: "custom", label: "Custom Range" },
];

export const COMPARE_MODES = [
  { value: "none", label: "No comparison" },
  { value: "wow", label: "Week over Week" },
  { value: "mom", label: "Month over Month" },
  { value: "qoq", label: "Quarter over Quarter" },
  { value: "yoy", label: "Year over Year" },
];

/** Resolve a preset into an ISO from/to range. */
export function resolvePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const startOfMonth = (y: number, m: number) => new Date(y, m, 1);

  switch (preset) {
    case "this_month":
      return {
        from: iso(startOfMonth(now.getFullYear(), now.getMonth())),
        to: iso(startOfMonth(now.getFullYear(), now.getMonth() + 1)),
      };
    case "last_month":
      return {
        from: iso(startOfMonth(now.getFullYear(), now.getMonth() - 1)),
        to: iso(startOfMonth(now.getFullYear(), now.getMonth())),
      };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        from: iso(startOfMonth(now.getFullYear(), q * 3)),
        to: iso(startOfMonth(now.getFullYear(), q * 3 + 3)),
      };
    }
    case "ytd":
      return {
        from: iso(new Date(now.getFullYear(), 0, 1)),
        to: iso(new Date(now.getFullYear() + 1, 0, 1)),
      };
    case "last_12m":
    default:
      return {
        from: iso(startOfMonth(now.getFullYear(), now.getMonth() - 11)),
        to: iso(startOfMonth(now.getFullYear(), now.getMonth() + 1)),
      };
  }
}

export const DEFAULT_FILTERS: Filters = {
  preset: "last_12m",
  ...resolvePreset("last_12m"),
  rep: "all",
  state: "all",
  customer: "all",
  product: "all",
  supplier: "all",
  compare: "none",
};

export default function FilterBar({
  filters,
  options,
  onChange,
}: {
  filters: Filters;
  options: FilterOptions | null;
  onChange: (f: Filters) => void;
}) {
  function set(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    if (patch.preset && patch.preset !== "custom") {
      Object.assign(next, resolvePreset(patch.preset));
    }
    onChange(next);
  }

  const dateValue = (iso: string) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="card mb-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 section-title">
          <SlidersHorizontal style={{ width: 15, height: 15 }} /> Filters
        </span>
        <button
          onClick={() => onChange({ ...DEFAULT_FILTERS })}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-arus-purple"
        >
          <RotateCcw style={{ width: 13, height: 13 }} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <div>
          <label className="label">Period</label>
          <select
            className="input"
            value={filters.preset}
            onChange={(e) => set({ preset: e.target.value })}
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {filters.preset === "custom" && (
          <>
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                value={dateValue(filters.from)}
                onChange={(e) =>
                  set({ from: new Date(e.target.value).toISOString() })
                }
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                value={dateValue(filters.to)}
                onChange={(e) =>
                  set({ to: new Date(e.target.value).toISOString() })
                }
              />
            </div>
          </>
        )}

        <div>
          <label className="label">Compare</label>
          <select
            className="input"
            value={filters.compare}
            onChange={(e) => set({ compare: e.target.value })}
          >
            {COMPARE_MODES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Sales Rep</label>
          <select
            className="input"
            value={filters.rep}
            onChange={(e) => set({ rep: e.target.value })}
          >
            <option value="all">All reps</option>
            {options?.reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Region</label>
          <select
            className="input"
            value={filters.state}
            onChange={(e) => set({ state: e.target.value })}
          >
            <option value="all">All regions</option>
            {options?.states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Customer</label>
          <select
            className="input"
            value={filters.customer}
            onChange={(e) => set({ customer: e.target.value })}
          >
            <option value="all">All customers</option>
            {options?.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.hospital_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Product</label>
          <select
            className="input"
            value={filters.product}
            onChange={(e) => set({ product: e.target.value })}
          >
            <option value="all">All products</option>
            {options?.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Supplier</label>
          <select
            className="input"
            value={filters.supplier}
            onChange={(e) => set({ supplier: e.target.value })}
          >
            <option value="all">All suppliers</option>
            {options?.suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
