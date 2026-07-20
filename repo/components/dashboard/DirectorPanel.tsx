"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ShieldCheck, GitCompare } from "lucide-react";
import { formatMYR, formatHours, statusLabel } from "@/lib/format";

const FUNNEL_STEPS = [
  { key: "requested", label: "Requests received" },
  { key: "picked_up", label: "Picked up by Ops" },
  { key: "completed", label: "Quote completed" },
  { key: "sent", label: "Sent to customer" },
  { key: "converted", label: "Converted to PO" },
];

type Metric = {
  label: string;
  key: string;
  fmt: (v: any) => string;
  /** lower is better */
  lower?: boolean;
};

const REP_METRICS: Metric[] = [
  { label: "Requests handled", key: "requests", fmt: (v) => String(v ?? 0) },
  { label: "Completed", key: "completed", fmt: (v) => String(v ?? 0) },
  {
    label: "Avg turnaround",
    key: "avg_turnaround_hrs",
    fmt: (v) => formatHours(v),
    lower: true,
  },
  { label: "Revenue", key: "revenue", fmt: (v) => formatMYR(v) },
  { label: "Margin", key: "margin", fmt: (v) => formatMYR(v) },
  {
    label: "Margin %",
    key: "margin_pct",
    fmt: (v) => `${Number(v ?? 0).toFixed(1)}%`,
  },
];

const REGION_METRICS: Metric[] = [
  { label: "Quote requests", key: "requests", fmt: (v) => String(v ?? 0) },
  { label: "Completed", key: "completed", fmt: (v) => String(v ?? 0) },
  {
    label: "Avg turnaround",
    key: "avg_turnaround_hrs",
    fmt: (v) => formatHours(v),
    lower: true,
  },
  { label: "Purchase orders", key: "po_count", fmt: (v) => String(v ?? 0) },
  { label: "Revenue", key: "value", fmt: (v) => formatMYR(v) },
  { label: "Margin", key: "margin", fmt: (v) => formatMYR(v) },
  {
    label: "Margin %",
    key: "margin_pct",
    fmt: (v) => `${Number(v ?? 0).toFixed(1)}%`,
  },
];

function CompareTable({
  a,
  b,
  metrics,
}: {
  a: any;
  b: any;
  metrics: Metric[];
}) {
  return (
    <table className="min-w-full">
      <tbody className="divide-y divide-slate-100">
        {metrics.map((m) => {
          const av = Number(a?.[m.key] ?? 0);
          const bv = Number(b?.[m.key] ?? 0);
          const aWins = m.lower
            ? av > 0 && (bv === 0 || av < bv)
            : av > bv;
          const bWins = m.lower
            ? bv > 0 && (av === 0 || bv < av)
            : bv > av;
          return (
            <tr key={m.key}>
              <td
                className={`py-2.5 text-sm ${
                  aWins ? "font-bold text-arus-purple" : "text-slate-600"
                }`}
              >
                {m.fmt(a?.[m.key])}
              </td>
              <td className="py-2.5 text-center text-xs text-slate-400">
                {m.label}
              </td>
              <td
                className={`py-2.5 text-right text-sm ${
                  bWins ? "font-bold text-arus-purple" : "text-slate-600"
                }`}
              >
                {m.fmt(b?.[m.key])}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function DirectorPanel({
  funnel,
  bottleneck,
  byRep,
  byRegion,
  summary,
}: {
  funnel: any;
  bottleneck: any[];
  byRep: any[];
  byRegion: any[];
  summary: any;
}) {
  const [mode, setMode] = useState<"rep" | "region">("rep");
  const [aIdx, setAIdx] = useState(0);
  const [bIdx, setBIdx] = useState(1);

  const list = mode === "rep" ? byRep : byRegion;
  const metrics = mode === "rep" ? REP_METRICS : REGION_METRICS;
  const nameOf = (x: any) => (mode === "rep" ? x?.name : x?.state);

  const total = Number(funnel?.requested ?? 0) || 1;
  const conversionRate =
    Number(funnel?.requested ?? 0) > 0
      ? Number(funnel?.converted ?? 0) / Number(funnel.requested)
      : 0;

  const openCount = Number(summary?.quotes_open ?? 0);
  const avgOrderValue =
    Number(summary?.quotes_requested ?? 0) > 0
      ? Number(summary?.revenue ?? 0) / Number(summary.quotes_requested)
      : 0;
  const forecast = openCount * avgOrderValue * (conversionRate || 0.3);
  const forecastMargin =
    forecast * (Number(summary?.margin_pct ?? 30) / 100);

  const bottleneckData = bottleneck.map((b) => ({
    name: statusLabel(b.status),
    hours: Number(b.avg_hrs),
  }));

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-arus-purple p-2 text-arus-amber">
          <ShieldCheck style={{ width: 16, height: 16 }} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Director Insights</h2>
          <p className="text-xs text-slate-500">
            Deeper analysis available to directors only
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Quote to PO Conversion Funnel
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Overall conversion {(conversionRate * 100).toFixed(1)}%
          </p>
          <div className="space-y-3">
            {FUNNEL_STEPS.map((s) => {
              const v = Number(funnel?.[s.key] ?? 0);
              const pct = (v / total) * 100;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-semibold text-slate-900">
                      {v}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-arus-purple"
                      style={{ width: `${Math.max(pct, 1.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottleneck */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Turnaround Bottlenecks
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Average hours spent in each stage — highest first
          </p>
          {bottleneckData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bottleneckData} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: any) => [`${Number(v).toFixed(1)} hrs`, "Avg time"]}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {bottleneckData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#F26522" : "#4E1A6B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">Not enough history yet.</p>
          )}
        </div>

        {/* Forecast */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Pipeline Forecast
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Open requests weighted by historical conversion
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Open</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {openCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversion</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(conversionRate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fcst revenue</p>
              <p className="mt-1 text-xl font-bold text-arus-orange">
                {formatMYR(forecast)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fcst margin</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {formatMYR(forecastMargin)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Forecast margin applies the period&apos;s realised margin rate to
            projected revenue.
          </p>
        </div>

        {/* Head to head — reps or regions */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <GitCompare style={{ width: 15, height: 15 }} /> Head-to-Head
            </h3>
            <div className="flex gap-1">
              {(["rep", "region"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setAIdx(0);
                    setBIdx(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    mode === m
                      ? "bg-arus-purple text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m === "rep" ? "Sales Reps" : "Regions"}
                </button>
              ))}
            </div>
          </div>

          {list.length >= 2 ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <select
                  className="input"
                  value={aIdx}
                  onChange={(e) => setAIdx(Number(e.target.value))}
                >
                  {list.map((x, i) => (
                    <option key={i} value={i}>
                      {nameOf(x)}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={bIdx}
                  onChange={(e) => setBIdx(Number(e.target.value))}
                >
                  {list.map((x, i) => (
                    <option key={i} value={i}>
                      {nameOf(x)}
                    </option>
                  ))}
                </select>
              </div>

              <CompareTable
                a={list[aIdx]}
                b={list[bIdx]}
                metrics={metrics}
              />
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Need at least two {mode === "rep" ? "reps" : "regions"} with
              activity in this period.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
