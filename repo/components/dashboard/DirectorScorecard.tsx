"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Target,
  Filter,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
} from "lucide-react";
import { formatMYR, formatMYRShort } from "@/lib/format";
import type { FilterOptions } from "./FilterBar";
import HeatMap from "./HeatMap";
import Pareto from "./Pareto";
import BarList from "./BarList";
import ExpandableChart from "./ExpandableChart";
import DirectorPanel from "./DirectorPanel";

const RANGES = [
  { key: "3m", label: "3M", months: 3 },
  { key: "6m", label: "6M", months: 6 },
  { key: "12m", label: "12M", months: 12 },
];
const COMPARES = [
  { key: "mom", label: "MoM" },
  { key: "qoq", label: "QoQ" },
  { key: "yoy", label: "YoY" },
];
const GRANS = [
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "year", label: "Yearly" },
];

function isoFrom(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}
function pct(a: number, b: number) {
  if (!b) return null;
  return ((a - b) / b) * 100;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const c = pct(current, previous);
  if (c == null || !isFinite(c)) return null;
  const Icon = c >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${
        c >= 0 ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon style={{ width: 13, height: 13 }} />
      {Math.abs(c).toFixed(1)}%
    </span>
  );
}

function Spark({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return null;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 50;
      const y = 16 - ((v - min) / span) * 14 - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 50 16" style={{ width: 50, height: 16 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}

/** Combo bar (period revenue) + line (cumulative %) built from heatmap cells. */
function PeriodCombo({ cells }: { cells: { row: string; col: string; v: number }[] }) {
  const m = new Map<string, number>();
  cells.forEach((c) => m.set(c.col, (m.get(c.col) ?? 0) + c.v));
  const arr = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const tot = arr.reduce((a, r) => a + r[1], 0) || 1;
  let run = 0;
  const data = arr.map(([period, rev]) => {
    run += rev;
    return { period, Revenue: rev, Cumulative: (run / tot) * 100 };
  });
  if (!data.length) return <p className="text-sm text-slate-400">No data.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMYRShort(v)} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: any, n: any) => (n === "Cumulative" ? `${Number(v).toFixed(1)}%` : formatMYR(Number(v)))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="Revenue" fill="#F26522" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="Cumulative" stroke="#3B1053" strokeWidth={2} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function DirectorScorecard({
  name,
  options,
}: {
  name: string;
  options: FilterOptions | null;
}) {
  const [rangeKey, setRangeKey] = useState("12m");
  const [compare, setCompare] = useState("mom");
  const [gran, setGran] = useState("month");
  const [f, setF] = useState({ rep: "", state: "", customer: "", product: "" });
  const [data, setData] = useState<any>(null);
  const [ops, setOps] = useState<any>(null);
  const [act, setAct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const range = RANGES.find((r) => r.key === rangeKey)!;

  const load = useCallback(async () => {
    setLoading(true);
    const from = isoFrom(range.months);
    const qs = new URLSearchParams({ from, compare, gran });
    const oqs = new URLSearchParams({ from, compare });
    if (f.rep) { qs.set("rep", f.rep); oqs.set("rep", f.rep); }
    if (f.state) { qs.set("state", f.state); oqs.set("state", f.state); }
    if (f.customer) { qs.set("customer", f.customer); oqs.set("customer", f.customer); }
    if (f.product) { qs.set("product", f.product); oqs.set("product", f.product); }
    const [sd, ai, od] = await Promise.all([
      fetch(`/api/sales-dashboard?${qs}`).then((r) => r.json()),
      fetch("/api/action-items").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/dashboard?${oqs}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setData(sd);
    setAct(ai);
    setOps(od);
    setLoading(false);
  }, [range.months, compare, gran, f]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary ?? {};
  const prev = data?.previous ?? {};
  const revenue = Number(s.revenue ?? 0);
  const target = Number(s.target ?? 0);
  const targetPct = target > 0 ? (revenue / target) * 100 : 0;
  const byRep: any[] = data?.by_rep ?? [];
  const topProducts: any[] = data?.top_products ?? [];

  const fmtBucket = (b: string) =>
    new Date(b).toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
  const revTrend = (data?.revenue_trend ?? []).map((r: any) => ({
    name: fmtBucket(r.bucket),
    Revenue: Number(r.rev),
  }));

  const cell = (rows: any[]) =>
    (rows ?? []).map((r: any) => ({ row: r.label ?? "—", col: r.period, v: Number(r.v) }));
  const hmRep = cell(data?.hm_rep);
  const hmRegion = cell(data?.hm_region);

  // Region treemap from hm_region totals
  const regionTotals = useMemo(() => {
    const m = new Map<string, number>();
    (data?.hm_region ?? []).forEach((r: any) =>
      m.set(r.label, (m.get(r.label) ?? 0) + Number(r.v))
    );
    const arr = [...m.entries()].map(([label, v]) => ({ label, v }));
    arr.sort((a, b) => b.v - a.v);
    const tot = arr.reduce((a, r) => a + r.v, 0) || 1;
    return arr.slice(0, 6).map((r) => ({ ...r, share: (r.v / tot) * 100 }));
  }, [data]);

  // per-rep sparkline series from hm_rep
  const repSpark = useMemo(() => {
    const m = new Map<string, { period: string; v: number }[]>();
    (data?.hm_rep ?? []).forEach((r: any) => {
      const a = m.get(r.label) ?? [];
      a.push({ period: r.period, v: Number(r.v) });
      m.set(r.label, a);
    });
    m.forEach((a) => a.sort((x, y) => x.period.localeCompare(y.period)));
    return m;
  }, [data]);

  const companyRev = byRep.reduce((a, r) => a + Number(r.revenue || 0), 0);
  // Only show reps with attributed revenue; collapse the rest into a count.
  const activeReps = byRep.filter((r: any) => Number(r.revenue) > 0);
  const hiddenReps = byRep.length - activeReps.length;
  const topRep = byRep[0];
  const topRegion = regionTotals[0];

  // pace: how far through the period vs how far to target
  const paceLabel =
    target > 0
      ? targetPct >= 90
        ? "on track"
        : targetPct >= 60
        ? "behind pace"
        : "well behind"
      : "no target set";

  const red = Number(act?.red ?? 0);
  const amber = Number(act?.amber ?? 0);
  // Grouped exceptions (management-by-exception) — each has a readable label + count.
  const decisions: any[] = [...(act?.by_rule ?? [])]
    .filter((r: any) => (r.n ?? 0) > 0)
    .sort((a: any, b: any) => (b.red ?? 0) - (a.red ?? 0) || (b.n ?? 0) - (a.n ?? 0))
    .slice(0, 5);

  const treeColors = ["#3B1053", "#5a3a7d", "#7a5a99", "#8a6aa8", "#a487c0", "#c4b1da"];
  const selectCls = "input h-9 w-auto min-w-[130px] py-1 text-sm";

  return (
    <div>
      {/* Header + controls */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Performance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Guided scorecard for {name.split(" ")[0]}
            {loading && <span className="ml-2 text-arus-orange">updating…</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg items={RANGES} value={rangeKey} onChange={setRangeKey} />
          <Seg items={COMPARES} value={compare} onChange={setCompare} accent />
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Filter style={{ width: 14, height: 14 }} /> Filters
          </span>
          <select className={selectCls} value={f.rep} onChange={(e) => setF({ ...f, rep: e.target.value })}>
            <option value="">All reps</option>
            {(options?.reps ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select className={selectCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>
            <option value="">All regions</option>
            {(options?.states ?? []).map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <select className={selectCls} value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })}>
            <option value="">All hospitals</option>
            {(options?.customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.hospital_name}</option>
            ))}
          </select>
          <select className={selectCls} value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>
            <option value="">All products</option>
            {(options?.products ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage rail */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* 1 Target — never alarm-red; amber signals "behind", red is reserved for Execution alerts */}
        <Stage n="1 · Target" tone={targetPct >= 90 ? "g" : "a"} flag={paceLabel}>
          <div className="flex items-center gap-3">
            <Ring pct={Math.min(100, targetPct)} />
            <div>
              <div className="text-lg font-bold text-slate-900">
                {formatMYRShort(revenue)} <Delta current={revenue} previous={Number(prev.revenue ?? 0)} />
              </div>
              <div className="text-xs text-slate-500">
                of {target > 0 ? formatMYRShort(target) : "—"} target
              </div>
            </div>
          </div>
        </Stage>
        {/* 2 Pipeline */}
        <Stage n="2 · Pipeline" tone={Number(s.conversion_pct ?? 0) >= 20 ? "g" : "a"} flag={`${Number(s.conversion_pct ?? 0).toFixed(0)}% conversion`}>
          <Funnel
            requested={Number(s.quotes_requested ?? 0)}
            completed={Number(s.quotes_completed ?? 0)}
            won={Number(s.converted_to_po ?? 0)}
          />
          {topRep && topRegion && (
            <p className="mt-2 text-[11px] text-slate-500">
              Led by <b>{topRep.name}</b> · <b>{topRegion.label}</b> region
            </p>
          )}
        </Stage>
        {/* 3 Execution */}
        <Stage n="3 · Execution" tone={Number(s.margin_pct ?? 0) < 25 ? "r" : "g"} flag={`${Number(s.margin_pct ?? 0).toFixed(1)}% margin`}>
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Margin" value={`${Number(s.margin_pct ?? 0).toFixed(1)}%`} />
            <Mini label="Gross" value={formatMYRShort(s.margin)} />
            <Mini label="Alerts (red)" value={red} tone={red ? "r" : undefined} />
            <Mini label="Watch (amber)" value={amber} tone={amber ? "a" : undefined} />
          </div>
        </Stage>
        {/* 4 Decisions */}
        <Stage n="4 · Decisions" tone="p" flag={`${red + amber} need you`}>
          {decisions.length ? (
            <div className="space-y-1">
              {decisions.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-700">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${(d.red ?? 0) > 0 ? "bg-rose-500" : "bg-amber-500"}`} />
                  <span className="truncate">{d.label ?? d.code}</span>
                  <span className="ml-auto shrink-0 font-bold text-slate-500">{d.n}</span>
                </div>
              ))}
              <Link href="/actions" className="mt-1 inline-block text-[11px] font-semibold text-arus-purple hover:underline">
                Open Action Centre →
              </Link>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nothing needs you. 🎉</p>
          )}
        </Stage>
      </div>

      {/* Trend */}
      <div className="mb-6">
        <ExpandableChart
          title="Revenue over time"
          subtitle={`Company · last ${range.months} months`}
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Products — Pareto 80/20</h4>
              <Pareto rows={topProducts.map((p) => ({ name: p.name, value: Number(p.value) }))} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={revTrend}>
              <defs>
                <linearGradient id="dsc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F26522" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F26522" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMYRShort(v)} />
              <Tooltip formatter={(v: any) => formatMYR(Number(v))} />
              <Area type="monotone" dataKey="Revenue" stroke="#F26522" strokeWidth={2} fill="url(#dsc)" />
            </AreaChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      {/* Heatmaps */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Heatmaps</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Sparse cells reflect demo data — fills in with the historical import
          </p>
        </div>
        <Seg items={GRANS} value={gran} onChange={setGran} />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpandableChart
          title="Rep × period revenue"
          subtitle="Who's hot and cold"
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Revenue by period + cumulative
              </h4>
              <PeriodCombo cells={hmRep} />
            </div>
          }
        >
          <HeatMap cells={hmRep} rowLabel="Rep" />
        </ExpandableChart>
        <ExpandableChart
          title="Region × period revenue"
          subtitle="Territory momentum"
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Revenue by period + cumulative
              </h4>
              <PeriodCombo cells={hmRegion} />
            </div>
          }
        >
          <HeatMap cells={hmRegion} rowLabel="Region" />
        </ExpandableChart>
      </div>

      {/* Drivers */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Products — Pareto 80/20</h3>
          <Pareto rows={topProducts.map((p) => ({ name: p.name, value: Number(p.value) }))} height={230} />
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Revenue by region</h3>
          {regionTotals.length ? (
            <div className="space-y-1.5">
              {regionTotals.map((r, i) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-slate-600">{r.label}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded" style={{ width: `${r.share}%`, background: treeColors[i % treeColors.length] }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-slate-700">{r.share.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No data.</p>
          )}
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Top products</h3>
          <BarList rows={topProducts.map((p) => ({ name: p.name, value: Number(p.value), marginPct: p.margin_pct }))} limit={6} />
        </div>
      </div>

      {/* Rep contribution */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Rep contribution vs company</h3>
          <span className="text-xs text-slate-400">{formatMYR(companyRev)} attributed to reps</span>
        </div>
        <div className="space-y-2.5">
          {activeReps.map((r, i) => {
            const share = companyRev > 0 ? (Number(r.revenue) / companyRev) * 100 : 0;
            const spark = (repSpark.get(r.name) ?? []).map((x) => x.v);
            const rag = i < activeReps.length / 3 ? "g" : i < (2 * activeReps.length) / 3 ? "a" : "r";
            return (
              <div key={r.id} className="grid grid-cols-[150px_1fr_44px_54px] items-center gap-3">
                <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
                  <i className={`h-2 w-2 rounded-full ${rag === "g" ? "bg-emerald-500" : rag === "a" ? "bg-amber-500" : "bg-rose-500"}`} />
                  {r.name}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-arus-orange" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
                <span className="text-right text-xs font-bold text-slate-700">{share.toFixed(0)}%</span>
                <Spark vals={spark} color={rag === "g" ? "#0f9d6b" : rag === "a" ? "#e59a1c" : "#c0362f"} />
              </div>
            );
          })}
          {activeReps.length === 0 && (
            <p className="text-sm text-slate-400">No rep-attributed revenue in range.</p>
          )}
          {hiddenReps > 0 && activeReps.length > 0 && (
            <p className="pt-1 text-xs text-slate-400">
              +{hiddenReps} rep{hiddenReps > 1 ? "s" : ""} with no attributed revenue this range
            </p>
          )}
        </div>
      </div>

      {/* Deeper pipeline funnel, turnaround bottlenecks, forecast & Head-to-Head */}
      {ops && (
        <DirectorPanel
          funnel={ops.funnel}
          bottleneck={ops.bottleneck ?? []}
          byRep={ops.by_rep ?? []}
          byRegion={ops.by_region ?? []}
          summary={ops.summary ?? {}}
        />
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        Every chart drills down · filters cross-connect · multi-year comparison (2025/26/27) unlocks with historical import.
      </p>
    </div>
  );
}

/* ---- small building blocks ---- */
function Seg({
  items,
  value,
  onChange,
  accent,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === it.key
              ? accent
                ? "bg-arus-amber text-arus-amberDark"
                : "bg-arus-purple text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Stage({
  n,
  tone,
  flag,
  children,
}: {
  n: string;
  tone: "g" | "a" | "r" | "p";
  flag: string;
  children: React.ReactNode;
}) {
  const top =
    tone === "r" ? "border-t-rose-500" : tone === "a" ? "border-t-amber-500" : tone === "p" ? "border-t-arus-purple" : "border-t-emerald-500";
  const badge =
    tone === "r" ? "bg-rose-50 text-rose-700" : tone === "a" ? "bg-amber-50 text-amber-700" : tone === "p" ? "bg-arus-purple/10 text-arus-purple" : "bg-emerald-50 text-emerald-700";
  return (
    <div className={`card border-t-[3px] ${top}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{n}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>{flag}</span>
      </div>
      {children}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#3B1053 ${pct}%, #e9e4f0 0)` }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-arus-purple">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function Funnel({ requested, completed, won }: { requested: number; completed: number; won: number }) {
  const w = (n: number) => (requested ? Math.max(4, (n / requested) * 100) : 0);
  const rows = [
    { n: requested, label: "requested", width: 100, c: "#3B1053" },
    { n: completed, label: "completed", width: w(completed), c: "#7a4fa3" },
    { n: won, label: "won", width: w(won), c: "#F26522" },
  ];
  // Label sits OUTSIDE the bar in dark text so short bars (e.g. "won") stay readable.
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-[15px] max-w-[70%] rounded" style={{ width: `${r.width}%`, minWidth: 6, background: r.c }} />
          <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-600">
            <b className="text-slate-900">{r.n}</b> {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: any; tone?: "r" | "a" }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <p className="text-[9.5px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-base font-bold ${tone === "r" ? "text-rose-600" : tone === "a" ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
