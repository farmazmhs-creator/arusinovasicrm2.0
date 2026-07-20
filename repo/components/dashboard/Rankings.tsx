"use client";

import { useState } from "react";
import { ChevronDown, Trophy, Package, Users, MapPin } from "lucide-react";
import { formatMYR, formatHours } from "@/lib/format";

type Props = {
  topCustomers: any[];
  topProducts: any[];
  topReps: any[];
  topRegions: any[];
};

function Panel({
  title,
  icon: Icon,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="rounded-lg bg-arus-purple/10 p-2 text-arus-purple">
            <Icon style={{ width: 16, height: 16 }} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              {title}
            </span>
            {subtitle && (
              <span className="block text-xs text-slate-500">{subtitle}</span>
            )}
          </span>
        </span>
        <ChevronDown
          style={{ width: 18, height: 18 }}
          className={`text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div
        className="h-1.5 rounded-full bg-arus-amber"
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

export default function Rankings({
  topCustomers,
  topProducts,
  topReps,
  topRegions,
}: Props) {
  const maxCust = Math.max(...topCustomers.map((c) => Number(c.value)), 1);
  const maxProd = Math.max(...topProducts.map((p) => Number(p.value)), 1);
  const maxRep = Math.max(...topReps.map((r) => Number(r.quoted_value)), 1);
  const maxReg = Math.max(...topRegions.map((r) => Number(r.value)), 1);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        title="Top 10 Customers"
        subtitle="By purchase order value"
        icon={Trophy}
        defaultOpen
      >
        <div className="space-y-3">
          {topCustomers.map((c, i) => (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-slate-700">
                  <span className="mr-2 text-xs font-semibold text-slate-400">
                    {i + 1}
                  </span>
                  {c.hospital_name ?? c.name}
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatMYR(c.value)}
                </span>
              </div>
              <Bar pct={(Number(c.value) / maxCust) * 100} />
              <p className="mt-1 text-xs text-slate-400">
                {c.po_count} PO{c.po_count === 1 ? "" : "s"} · {c.state ?? "—"} ·{" "}
                <span className="font-medium text-emerald-600">
                  {Number(c.margin_pct ?? 0).toFixed(1)}% margin
                </span>
              </p>
            </div>
          ))}
          {topCustomers.length === 0 && (
            <p className="text-sm text-slate-400">No data for this selection.</p>
          )}
        </div>
      </Panel>

      <Panel
        title="Top 10 Products"
        subtitle="By delivered / ordered value"
        icon={Package}
        defaultOpen
      >
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-slate-700">
                  <span className="mr-2 text-xs font-semibold text-slate-400">
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatMYR(p.value)}
                </span>
              </div>
              <Bar pct={(Number(p.value) / maxProd) * 100} />
              <p className="mt-1 text-xs text-slate-400">
                {p.qty} units · {p.supplier ?? "—"} ·{" "}
                <span className="font-medium text-emerald-600">
                  {Number(p.margin_pct ?? 0).toFixed(1)}% margin
                </span>
              </p>
            </div>
          ))}
          {topProducts.length === 0 && (
            <p className="text-sm text-slate-400">No data for this selection.</p>
          )}
        </div>
      </Panel>

      <Panel
        title="Sales Agent Performance"
        subtitle="Requests, completion rate and turnaround"
        icon={Users}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="th">Rep</th>
                <th className="th">Requests</th>
                <th className="th">Completed</th>
                <th className="th">Avg Turnaround</th>
                <th className="th text-right">Revenue</th>
                <th className="th text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topReps.map((r, i) => (
                <tr key={i}>
                  <td className="td font-medium text-slate-800">
                    {r.name}{" "}
                    <span className="text-xs text-slate-400">{r.code}</span>
                  </td>
                  <td className="td">{r.requests}</td>
                  <td className="td">
                    {r.completed}
                    <span className="ml-1 text-xs text-slate-400">
                      (
                      {r.requests > 0
                        ? Math.round((r.completed / r.requests) * 100)
                        : 0}
                      %)
                    </span>
                  </td>
                  <td className="td">{formatHours(r.avg_turnaround_hrs)}</td>
                  <td className="td whitespace-nowrap text-right font-medium">
                    {formatMYR(r.revenue)}
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    <span className="font-medium text-emerald-600">
                      {Number(r.margin_pct ?? 0).toFixed(1)}%
                    </span>
                    <span className="block text-xs text-slate-400">
                      {formatMYR(r.margin)}
                    </span>
                  </td>
                </tr>
              ))}
              {topReps.length === 0 && (
                <tr>
                  <td className="td text-slate-400" colSpan={6}>
                    No data for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Top 3 Regions"
        subtitle="By purchase order value"
        icon={MapPin}
      >
        <div className="space-y-4">
          {topRegions.map((r, i) => (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-700">
                  #{i + 1} {r.state}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatMYR(r.value)}
                </span>
              </div>
              <Bar pct={(Number(r.value) / maxReg) * 100} />
              <p className="mt-1 text-xs text-slate-400">
                {r.po_count} purchase orders
              </p>
            </div>
          ))}
          {topRegions.length === 0 && (
            <p className="text-sm text-slate-400">No data for this selection.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
