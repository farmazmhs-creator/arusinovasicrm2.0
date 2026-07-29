"use client";

import { useState } from "react";
import { LineChart, Settings2 } from "lucide-react";
import type { FilterOptions } from "./FilterBar";
import SalesDashboard from "./SalesDashboard";
import DashboardClient from "./DashboardClient";

type View = "sales" | "ops";

/**
 * Top-level dashboard wrapper. Shows a Sales / Ops toggle and defaults to the
 * right view for the signed-in role:
 *   • sales_rep → Sales (their own numbers only; no toggle needed but allowed)
 *   • ops       → Ops
 *   • director  → Sales (can toggle to Ops)
 */
export default function DashboardShell({
  options,
  role,
  name,
}: {
  options: FilterOptions | null;
  role: string;
  name: string;
}) {
  const defaultView: View = role === "ops" ? "ops" : "sales";
  const [view, setView] = useState<View>(defaultView);

  const reps = options?.reps ?? [];

  return (
    <div>
      {/* View toggle */}
      <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setView("sales")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "sales"
              ? "bg-arus-purple text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <LineChart style={{ width: 16, height: 16 }} />
          Sales
        </button>
        <button
          onClick={() => setView("ops")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "ops"
              ? "bg-arus-purple text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings2 style={{ width: 16, height: 16 }} />
          Ops
        </button>
      </div>

      {view === "sales" ? (
        <SalesDashboard role={role} name={name} reps={reps} />
      ) : (
        <DashboardClient options={options} role={role} name={name} />
      )}
    </div>
  );
}
