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
  RotateCcw,
} from "lucide-react";
import { formatMYR, formatMYRShort } from "@/lib/format";
import type { FilterOptions } from "./FilterBar";
import ExpandableChart from "./ExpandableChart";
import Pareto from "./Pareto";
import BarList from "./BarList";
import HeatMap from "./HeatMap";

type Range = { key: string; label: string; months: number };
const RANGES: Range[] = [
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

const EMPTY_FILTERS = {
  state: "",
  customer: "",
  contact: "",
  product: "",
};

export default function SalesDashboard({
  role,
  name,
  options,
}: {
  role: string;
  name: string;
  options: FilterOptions | null;
}) {
  const isRep = role === "sales_rep";
  const reps = options?.reps ?? [];

  const [rangeKey, setRangeKey] = useState("12m");
  const [compare, setCompare] = useState("mom");
  const [hmGran, setHmGran] = useState("month");
  const [repId, setRepId] = useState<string>(""); // director/ops drill-down
  const [f, setF] = useState({ ...EMPTY_FILTERS });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const range = RANGES.find((r) => r.key === rangeKey)!;

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      from: isoFrom(range.months),
      compare,
      gran: hmGran,
    });
    if (!isRep && repId) qs.set("rep", repId);
    if (f.state) qs.set("state", f.state);
    if (f.customer) qs.set("customer", f.customer);
    if (f.contact) qs.set("contact", f.contact);
    if (f.product) qs.set("product", f.product);
    const res = await fetch(`/api/sales-dashboard?${qs}`);
    setData(await res.json());
    setLoading(false);
  }, [range.months, compare, hmGran, repId, f, isRep]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary ?? {};
  const prev = data?.previous ?? {};
  const gran = data?.range?.granularity ?? "month";
  const byRep: any[] = data?.by_rep ?? [];
  const topProducts: any[] = data?.top_products ?? [];
  const topCustomers: any[] = data?.top_customers ?? [];

  const scopedRepName = isRep
    ? name
    : repId
    ? reps.find((r) => r.id === repId)?.name ?? "Rep"
    : null;

  // Contacts filtered to the chosen hospital.
  const contactOptions = useMemo(
    () =>
      (options?.contacts ?? []).filter(
        (c) => !f.customer || c.customer_id === f.customer
      ),
    [options, f.customer]
  );

  const anyFilter = f.state || f.customer || f.contact || f.product;

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
    Converted: Number(r.converted),
  }));

  const target = Number(s.target ?? 0);
  const revenue = Number(s.revenue ?? 0);
  const targetPct = target > 0 ? (revenue / target) * 100 : null;

  const productBars = topProducts.map((p) => ({
    name: p.name,
    value: Number(p.value),
    marginPct: p.margin_pct,
    sub: `${p.qty} u`,
  }));
  const customerBars = topCustomers.map((c) => ({
    name: c.name || c.hospital_name,
    value: Number(c.value),
    marginPct: c.margin_pct,
    sub: `${c.po_count} PO`,
  }));

  const insights = useMemo(() => {
    const good: string[] = [];
    const watch: string[] = [];
    if (topProducts[0])
      good.push(`Top product: ${topProducts[0].name} (${formatMYR(topProducts[0].value)})`);
    if (topCustomers[0])
      good.push(
        `Top account: ${topCustomers[0].name || topCustomers[0].hospital_name} (${formatMYR(topCustomers[0].value)})`
      );
    const conv = Number(s.conversion_pct ?? 0);
    if (conv >= 20) good.push(`Healthy quote→PO conversion at ${conv}%`);
    else watch.push(`Low conversion — only ${conv}% of quotes became POs`);
    const mp = Number(s.margin_pct ?? 0);
    if (mp && mp < 25) watch.push(`Margin ${mp}% is below the 25% floor`);
    else if (mp) good.push(`Margin ${mp}% is above the 25% floor`);
    if (targetPct !== null && targetPct < 60)
      watch.push(`Only ${targetPct.toFixed(0)}% of target achieved so far`);
    return { good, watch };
  }, [topProducts, topCustomers, s, targetPct]);

  // Heatmap cells → {row, col, v}
  const toCells = (rows: any[], rowKey = "label") =>
    (rows ?? []).map((r: any) => ({
      row: r[rowKey] ?? "—",
      col: r.period ?? r.col_label,
      v: Number(r.v),
    }));
  const hmRep = toCells(data?.hm_rep);
  const hmRegion = toCells(data?.hm_region);
  const hmSupplier = toCells(data?.hm_supplier);
  const hmMatrix = (data?.hm_cust_sup ?? []).map((r: any) => ({
    row: r.row_label,
    col: r.col_label,
    v: Number(r.v),
  }));

  // True company revenue is the KPI total; rep rows only cover POs linked to a
  // rep's quote, so the attributed sum is usually less (rest = unlinked POs).
  const repAttributed = useMemo(
    () => byRep.reduce((a, r) => a + Number(r.revenue || 0), 0),
    [byRep]
  );
  const companyRev = Number(s.revenue ?? 0) || repAttributed;

  const selectCls =
    "input h-9 w-auto min-w-[130px] py-1 text-sm";

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
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
            {loading && <span className="ml-2 text-arus-orange">updating…</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-3">
          {!isRep && (
            <div>
              <label className="label">Rep</label>
              <select
                className={selectCls}
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
            </div>
          )}
          <div>
            <label className="label">Region</label>
            <select
              className={selectCls}
              value={f.state}
              onChange={(e) => setF({ ...f, state: e.target.value })}
            >
              <option value="">All regions</option>
              {(options?.states ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Hospital</label>
            <select
              className={selectCls}
              value={f.customer}
              onChange={(e) =>
                setF({ ...f, customer: e.target.value, contact: "" })
              }
            >
              <option value="">All hospitals</option>
              {(options?.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hospital_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Contact</label>
            <select
              className={selectCls}
              value={f.contact}
              onChange={(e) => setF({ ...f, contact: e.target.value })}
              disabled={!f.customer}
            >
              <option value="">
                {f.customer ? "All contacts" : "Pick a hospital first"}
              </option>
              {contactOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.department ? ` · ${c.department}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Product</label>
            <select
              className={selectCls}
              value={f.product}
              onChange={(e) => setF({ ...f, product: e.target.value })}
            >
              <option value="">All products</option>
              {(options?.products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {anyFilter && (
            <button
              onClick={() => setF({ ...EMPTY_FILTERS })}
              className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-arus-purple"
            >
              <RotateCcw style={{ width: 13, height: 13 }} /> Clear
            </button>
          )}
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
          value={target > 0 ? `${(targetPct ?? 0).toFixed(0)}%` : "—"}
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
          label="Quotes → PO Conversion"
          value={`${Number(s.conversion_pct ?? 0).toFixed(0)}%`}
          sub={`${s.quotes_requested ?? 0} requested · ${s.converted_to_po ?? 0} won`}
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

      {/* Trend charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpandableChart
          title="Revenue over time"
          subtitle={`${scopedRepName ?? "Company"} · last ${range.months} months`}
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Where the revenue concentrates — Pareto (80/20)
              </h4>
              <p className="mb-3 text-xs text-slate-500">
                Products sorted by value with the cumulative share line.
              </p>
              <Pareto rows={productBars} />
            </div>
          }
        >
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
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMYRShort(v)} />
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
        </ExpandableChart>

        <ExpandableChart
          title="Quotes — requested vs converted to PO"
          subtitle="How much of what came in turned into orders"
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Conversion rate by period
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quoteTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Requested" fill="#3B1053" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={quoteTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Requested" fill="#3B1053" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      {/* Top products / customers as bar lists */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpandableChart
          title="Top 10 products"
          subtitle="By revenue this period"
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Pareto — the products driving 80% of revenue
              </h4>
              <Pareto rows={productBars} />
            </div>
          }
        >
          <BarList rows={productBars} color="#F26522" />
        </ExpandableChart>

        <ExpandableChart
          title="Top 10 customers"
          subtitle="By revenue this period"
          detail={
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Pareto — the accounts driving 80% of revenue
              </h4>
              <Pareto rows={customerBars} />
            </div>
          }
        >
          <BarList rows={customerBars} color="#3B1053" />
        </ExpandableChart>
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

      {/* Heatmaps */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Heatmaps
        </h2>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {GRANS.map((g) => (
            <button
              key={g.key}
              onClick={() => setHmGran(g.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                hmGran === g.key
                  ? "bg-arus-purple text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {role === "director" && !repId && (
          <ExpandableChart
            title="Rep × period revenue"
            subtitle="Who's hot and cold, over time"
          >
            <HeatMap cells={hmRep} rowLabel="Rep" />
          </ExpandableChart>
        )}
        <ExpandableChart
          title="Region × period revenue"
          subtitle="Geographic concentration over time"
        >
          <HeatMap cells={hmRegion} rowLabel="State" />
        </ExpandableChart>
        <ExpandableChart
          title="Product line (supplier) × period"
          subtitle="Which principals sell when"
        >
          <HeatMap cells={hmSupplier} rowLabel="Supplier" />
        </ExpandableChart>
        <ExpandableChart
          title="Customer × product-line matrix"
          subtitle="Cross-sell view — spot the white space"
        >
          <HeatMap cells={hmMatrix} rowLabel="Hospital" />
        </ExpandableChart>
      </div>

      {/* Director-only: rep contribution */}
      {role === "director" && !repId && byRep.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card bg-arus-purple text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                Company revenue
              </p>
              <p className="mt-2 text-3xl font-bold">{formatMYR(companyRev)}</p>
              <p className="mt-1 text-xs text-white/70">
                {formatMYR(repAttributed)} linked to {byRep.length} reps · rest
                from POs with no rep
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Top contributor
              </p>
              <p className="mt-2 truncate text-2xl font-bold text-slate-900">
                {byRep[0]?.name ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatMYR(byRep[0]?.revenue ?? 0)} ·{" "}
                {companyRev > 0
                  ? ((Number(byRep[0]?.revenue ?? 0) / companyRev) * 100).toFixed(1)
                  : 0}
                % of company
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Avg per rep
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMYR(byRep.length ? repAttributed / byRep.length : 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">revenue contribution</p>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-1 text-sm font-semibold text-slate-800">
              Rep contribution vs company
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              Each rep&apos;s share of the {formatMYR(companyRev)} total · click a
              rep to drill in
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
                      companyRev > 0 ? (Number(r.revenue) / companyRev) * 100 : 0;
                    return (
                      <tr
                        key={r.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setRepId(r.id)}
                      >
                        <td className="td font-medium text-arus-purple">
                          {r.name}
                        </td>
                        <td className="td text-right">{formatMYR(r.revenue)}</td>
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
                        <td className="td text-right">{formatMYR(r.margin)}</td>
                        <td className="td text-right">{r.requests}</td>
                        <td className="td text-right">{r.converted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
