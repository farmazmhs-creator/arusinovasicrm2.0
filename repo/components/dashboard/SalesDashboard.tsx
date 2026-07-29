"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Target,
  Percent,
  TrendingUp,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { formatMYR, formatMYRShort } from "@/lib/format";

type RepOption = { id: string; name: string; code?: string };

type Range = { key: string; label: string; months: number };
const RANGES: Range[] = [
  { key: "3m", label: "3 months", months: 3 },
  { key: "6m", label: "6 months", months: 6 },
  { key: "12m", label: "12 months", months: 12 },
];
const COMPARES = [
  { key: "mom", label: "MoM" },
  { key: "qoq", label: "QoQ" },
  { key: "yoy", label: "YoY" },
];

function isoFrom(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

function Delta({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (!previous) return null;
  const change = ((current - previous) / previous) * 100;
  if (!isFinite(change)) return null;
  const good = invert ? change < 0 : change > 0;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        good ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon style={{ width: 13, height: 13 }} />
      {Math.abs(change).toFixed(1)}% vs prev
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  tone: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          <div className="mt-1">{children}</div>
        </div>
        <span className={`shrink-0 rounded-lg p-2.5 ${tone}`}>
          <Icon style={{ width: 18, height: 18 }} />
        </span>
      </div>
    </div>
  );
}

export default function SalesDashboard({
  role,
  name,
  reps,
}: {
  role: string;
  name: string;
  reps: RepOption[];
}) {
  const isRep = role === "sales_rep";
  const [rangeKey, setRangeKey] = useState("12m");
  const [compare, setCompare] = useState("mom");
  const [repId, setRepId] = useState<string>(""); // director/ops drill-down; "" = company
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const range = RANGES.find((r) => r.key === rangeKey)!;

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      from: isoFrom(range.months),
      compare,
    });
    if (!isRep && repId) qs.set("rep", repId);
    const res = await fetch(`/api/sales-dashboard?${qs}`);
    setData(await res.json());
    setLoading(false);
  }, [range.months, compare, repId, isRep]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary ?? {};
  const prev = data?.previous ?? {};
  const gran = data?.range?.granularity ?? "month";
  const byRep: any[] = data?.by_rep ?? [];
  const topProducts: any[] = data?.top_products ?? [];
  const topCustomers: any[] = data?.top_customers ?? [];

  // Whose numbers are we looking at?
  const scopedRepName = isRep
    ? name
    : repId
    ? reps.find((r) => r.id === repId)?.name ?? "Rep"
    : null; // null = whole company

  const fmtBucket = (b: string) => {
    const d = new Date(b);
    if (gran === "day" || gran === "week")
      return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
    return d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
  };

  const revTrend = (data?.revenue_trend ?? []).map((r: any) => ({
    name: fmtBucket(r.bucket),
    Revenue: Number(r.rev),
  }));
  const quoteTrend = (data?.quote_trend ?? []).map((r: any) => ({
    name: fmtBucket(r.bucket),
    Requested: Number(r.requested),
    Completed: Number(r.completed),
  }));

  const target = Number(s.target ?? 0);
  const revenue = Number(s.revenue ?? 0);
  const targetPct = target > 0 ? (revenue / target) * 100 : null;

  // Company total for director contribution %.
  const companyRev = useMemo(
    () => byRep.reduce((a, r) => a + Number(r.revenue || 0), 0),
    [byRep]
  );

  // Simple strengths / watch-outs.
  const insights = useMemo(() => {
    const good: string[] = [];
    const watch: string[] = [];
    if (topProducts[0])
      good.push(
        `Top product: ${topProducts[0].name} (${formatMYR(
          topProducts[0].value
        )})`
      );
    if (topCustomers[0])
      good.push(
        `Top account: ${topCustomers[0].name || topCustomers[0].hospital_name} (${formatMYR(
          topCustomers[0].value
        )})`
      );
    const conv = Number(s.conversion_pct ?? 0);
    if (conv >= 20) good.push(`Healthy quote→PO conversion at ${conv}%`);
    else watch.push(`Low conversion — ${conv}% of quotes became POs`);
    const mp = Number(s.margin_pct ?? 0);
    if (mp && mp < 25) watch.push(`Margin ${mp}% is below the 25% floor`);
    else if (mp) good.push(`Margin ${mp}% is above the 25% floor`);
    if (targetPct !== null && targetPct < 60)
      watch.push(`Only ${targetPct.toFixed(0)}% of target achieved so far`);
    return { good, watch };
  }, [topProducts, topCustomers, s, targetPct]);

  return (
    <div>
      {/* Header + scope */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isRep
              ? `My performance, ${name.split(" ")[0]}`
              : scopedRepName
              ? `${scopedRepName} — performance`
              : "Company sales"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRep
              ? "Your own numbers vs your assigned target"
              : scopedRepName
              ? "Drill-down for a single rep"
              : "Whole-company sales performance"}
            {loading && (
              <span className="ml-2 text-arus-orange">updating…</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Director/Ops: rep drill-down */}
          {!isRep && (
            <select
              className="input h-9 w-auto py-1 text-sm"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
            >
              <option value="">All reps (company)</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Range */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  rangeKey === r.key
                    ? "bg-arus-purple text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Compare */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {COMPARES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCompare(c.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  compare === c.key
                    ? "bg-arus-amber text-arus-amberDark"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Revenue"
          value={formatMYRShort(revenue)}
          sub={`${formatMYR(s.margin)} margin`}
          icon={TrendingUp}
          tone="bg-arus-orange/10 text-arus-orange"
        >
          <Delta current={revenue} previous={Number(prev.revenue ?? 0)} />
        </Kpi>

        <Kpi
          label={scopedRepName === null ? "Company Target" : "Target"}
          value={
            target > 0 ? `${(targetPct ?? 0).toFixed(0)}%` : "—"
          }
          sub={
            target > 0
              ? `${formatMYRShort(revenue)} of ${formatMYRShort(target)}`
              : "No target set for this period"
          }
          icon={Target}
          tone="bg-arus-purple/10 text-arus-purple"
        >
          {target > 0 && (
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-arus-purple"
                style={{ width: `${Math.min(100, targetPct ?? 0)}%` }}
              />
            </div>
          )}
        </Kpi>

        <Kpi
          label="Quotes → Conversion"
          value={`${Number(s.conversion_pct ?? 0).toFixed(0)}%`}
          sub={`${s.quotes_requested ?? 0} requested · ${
            s.converted_to_po ?? 0
          } won`}
          icon={FileText}
          tone="bg-arus-amber/20 text-arus-amberDark"
        >
          <Delta
            current={Number(s.quotes_requested ?? 0)}
            previous={Number(prev.quotes_requested ?? 0)}
          />
        </Kpi>

        <Kpi
          label="Margin"
          value={`${Number(s.margin_pct ?? 0).toFixed(1)}%`}
          sub={`${formatMYR(s.margin)} on ${formatMYRShort(revenue)}`}
          icon={Percent}
          tone={
            Number(s.margin_pct ?? 0) < 25
              ? "bg-rose-50 text-rose-600"
              : "bg-emerald-50 text-emerald-600"
          }
        >
          <Delta current={Number(s.margin ?? 0)} previous={Number(prev.margin ?? 0)} />
        </Kpi>
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Revenue over time
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            {scopedRepName ?? "Company"} · {range.label.toLowerCase()}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revTrend}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F26522" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#F26522" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatMYRShort(v)}
              />
              <Tooltip formatter={(v: any) => formatMYR(Number(v))} />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke="#F26522"
                strokeWidth={2}
                fill="url(#revFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Quotes — requested vs completed
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            How much of what came in got turned around
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={quoteTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Requested" fill="#3B1053" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#FDB813" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths / watch-outs */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Trophy style={{ width: 15, height: 15 }} /> Doing well
          </h3>
          {insights.good.length ? (
            <ul className="space-y-1.5 text-sm text-slate-700">
              {insights.good.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">•</span> {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No signals yet.</p>
          )}
        </div>
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertTriangle style={{ width: 15, height: 15 }} /> Watch-outs
          </h3>
          {insights.watch.length ? (
            <ul className="space-y-1.5 text-sm text-slate-700">
              {insights.watch.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-400">•</span> {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Nothing flagged.</p>
          )}
        </div>
      </div>

      {/* Top 10 products + customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Top 10 products
          </h3>
          <RankTable
            rows={topProducts}
            cols={[
              { head: "Product", cell: (r) => r.name, grow: true },
              { head: "Qty", cell: (r) => r.qty, align: "right" },
              {
                head: "Value",
                cell: (r) => formatMYR(r.value),
                align: "right",
              },
              {
                head: "Margin",
                cell: (r) => `${r.margin_pct ?? 0}%`,
                align: "right",
              },
            ]}
          />
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Top 10 customers
          </h3>
          <RankTable
            rows={topCustomers}
            cols={[
              {
                head: "Customer",
                cell: (r) => r.name || r.hospital_name,
                grow: true,
              },
              { head: "POs", cell: (r) => r.po_count, align: "right" },
              {
                head: "Value",
                cell: (r) => formatMYR(r.value),
                align: "right",
              },
              {
                head: "Margin",
                cell: (r) => `${r.margin_pct ?? 0}%`,
                align: "right",
              },
            ]}
          />
        </div>
      </div>

      {/* Director-only: per-rep contribution vs company */}
      {role === "director" && !repId && byRep.length > 0 && (
        <div className="card mt-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Rep contribution vs company
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Each rep&apos;s revenue share of the {formatMYR(companyRev)} company
            total · click a rep to drill in
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Rep</th>
                  <th className="th text-right">Revenue</th>
                  <th className="th">Share</th>
                  <th className="th text-right">Margin</th>
                  <th className="th text-right">Quotes</th>
                  <th className="th text-right">Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byRep.map((r) => {
                  const share =
                    companyRev > 0
                      ? (Number(r.revenue) / companyRev) * 100
                      : 0;
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setRepId(r.id)}
                    >
                      <td className="td font-medium text-arus-purple">
                        {r.name}
                      </td>
                      <td className="td text-right">
                        {formatMYR(r.revenue)}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-arus-amber"
                              style={{ width: `${Math.min(100, share)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="td text-right">
                        {formatMYR(r.margin)}
                      </td>
                      <td className="td text-right">{r.requests}</td>
                      <td className="td text-right">{r.completed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

type Col = {
  head: string;
  cell: (r: any) => React.ReactNode;
  align?: "right";
  grow?: boolean;
};

function RankTable({ rows, cols }: { rows: any[]; cols: Col[] }) {
  if (!rows.length)
    return <p className="text-sm text-slate-400">No data for this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.head}
                className={`th ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {cols.map((c) => (
                <td
                  key={c.head}
                  className={`td ${c.align === "right" ? "text-right" : ""} ${
                    c.grow ? "truncate max-w-[200px]" : "whitespace-nowrap"
                  }`}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
