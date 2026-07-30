"use client";

import { useState } from "react";
import { LineChart, Settings2 } from "lucide-react";
import type { FilterOptions } from "./FilterBar";
import SalesDashboard from "./SalesDashboard";
import DashboardClient from "./DashboardClient";

type View = "sales" | "ops";

/**
 * Top-level dashboard wrapper. The Sales / Ops toggle is shown to the DIRECTOR
 * ONLY. Other roles are locked to a single view:
 *   • sales_rep → Sales only (their own numbers; no Ops access)
 *   • ops       → Ops only
 *   • director  → both, via the toggle (defaults to Sales)
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
  const canToggle = role === "director";
  const defaultView: View = role === "ops" ? "ops" : "sales";
  const [view, setView] = useState<View>(defaultView);

  // Hard lock: non-directors can never render the other view even if state is
  // tampered with — force it back to their allowed view.
  const effectiveView: View = canToggle ? view : defaultView;

  return (
    <div>
      {canToggle && (
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
      )}

      {effectiveView === "sales" ? (
        <SalesDashboard role={role} name={name} options={options} />
      ) : (
        <DashboardClient options={options} role={role} name={name} />
      )}
    </div>
  );
}
