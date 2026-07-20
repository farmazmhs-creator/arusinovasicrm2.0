"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Timer,
  ShoppingCart,
  AlertCircle,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import FilterBar, {
  DEFAULT_FILTERS,
  type Filters,
  type FilterOptions,
} from "./FilterBar";
import Rankings from "./Rankings";
import DirectorPanel from "./DirectorPanel";
import {
  formatMYR,
  formatMYRShort,
  formatHours,
  formatDate,
  statusClass,
  statusLabel,
} from "@/lib/format";

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
      {Math.abs(change).toFixed(1)}%
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

export default function DashboardClient({
  options: initialOptions,
  role,
  name,
}: {
  options: FilterOptions | null;
  role: string;
  name: string;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [options] = useState<FilterOptions | null>(initialOptions);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    const qs = new URLSearchParams({
      from: f.from,
      to: f.to,
      rep: f.rep,
      state: f.state,
      customer: f.customer,
      product: f.product,
      supplier: f.supplier,
      compare: f.compare,
    });
    const res = await fetch(`/api/dashboard?${qs}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const s = data?.summary ?? {};
  const prev = data?.previous ?? {};
  const gran = data?.range?.granularity ?? "month";
  const comparing = filters.compare !== "none";

  const fmtBucket = (b: string) => {
    const d = new Date(b);
    if (gran === "day")
      return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
    if (gran === "week")
      return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
    return d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
  };

  const quoteTrend = (data?.quote_trend ?? []).map((r: any) => ({
    name: fmtBucket(r.bucket),
    Requested: Number(r.requested),
    Completed: Number(r.completed),
  }));

  const poTrend = (data?.po_trend ?? []).map((r: any) => ({
    name: fmtBucket(r.bucket),
    Value: Number(r.po_value),
    Orders: Number(r.po_count),
  }));

  const completionRate =
    Number(s.quotes_requested) > 0
      ? (Number(s.quotes_completed) / Number(s.quotes_requested)) * 100
      : 0;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Medical device sales performance
            {loading && <span className="ml-2 text-arus-orange">updating…</span>}
          </p>
        </div>
      </div>

      <FilterBar filters={filters} options={options} onChange={setFilters} />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Quote Requests"
          value={s.quotes_requested ?? 0}
          sub={`${s.quotes_completed ?? 0} completed · ${completionRate.toFixed(
            0
          )}% completion`}
          icon={FileText}
          tone="bg-arus-purple/10 text-arus-purple"
        >
          {comparing && (
            <Delta
              current={Number(s.quotes_requested ?? 0)}
              previous={Number(prev.quotes_requested ?? 0)}
            />
          )}
        </Kpi>

        <Kpi
          label="Avg Turnaround"
          value={formatHours(s.avg_turnaround_hrs)}
          sub={`Median ${formatHours(s.median_turnaround_hrs)}`}
          icon={Timer}
          tone="bg-arus-amber/20 text-arus-amberDark"
        >
          {comparing && (
            <Delta
              current={Number(s.avg_turnaround_hrs ?? 0)}
              previous={Number(prev.avg_turnaround_hrs ?? 0)}
              invert
            />
          )}
        </Kpi>

        <Kpi
          label="Purchase Orders"
          value={s.po_count ?? 0}
          sub={`${formatMYR(s.po_value)} received`}
          icon={ShoppingCart}
          tone="bg-arus-orange/10 text-arus-orange"
        >
          {comparing && (
            <Delta
              current={Number(s.po_value ?? 0)}
              previous={Number(prev.po_value ?? 0)}
            />
          )}
        </Kpi>

        <Kpi
          label="Margin"
          value={`${Number(s.margin_pct ?? 0).toFixed(1)}%`}
          sub={`${formatMYR(s.margin)} on ${formatMYR(s.revenue)}`}
          icon={Percent}
          tone="bg-emerald-50 text-emerald-600"
        >
          {comparing && (
            <Delta
              current={Number(s.margin ?? 0)}
              previous={Number(prev.margin ?? 0)}
            />
          )}
        </Kpi>

        <Kpi
          label="Open Requests"
          value={s.quotes_open ?? 0}
          sub={`${s.quotes_on_hold ?? 0} on hold`}
          icon={AlertCircle}
          tone="bg-rose-50 text-rose-600"
        >
          {comparing && (
            <Delta
              current={Number(s.quotes_open ?? 0)}
              previous={Number(prev.quotes_open ?? 0)}
              invert
            />
          )}
        </Kpi>
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Quote Requests — Requested vs Completed
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Volume received against volume turned around
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

        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Purchase Orders Received
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Order value over time — responds to every filter
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={poTrend}>
              <defs>
                <linearGradient id="poFill" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="Value"
                stroke="#F26522"
                strokeWidth={2}
                fill="url(#poFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings */}
      <Rankings
        topCustomers={data?.top_customers ?? []}
        topProducts={data?.top_products ?? []}
        topReps={data?.top_reps ?? []}
        topRegions={data?.top_regions ?? []}
      />

      {/* Pending tables */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Pending Quote Requests
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Ref</th>
                  <th className="th">Customer</th>
                  <th className="th">Status</th>
                  <th className="th">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.pending_quotes ?? []).map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="font-medium text-arus-purple hover:underline"
                      >
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="td truncate">
                      {q.customers?.hospital_name ?? "—"}
                    </td>
                    <td className="td">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
                          q.status
                        )}`}
                      >
                        {statusLabel(q.status)}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap">
                      {formatDate(q.received_at)}
                    </td>
                  </tr>
                ))}
                {(data?.pending_quotes ?? []).length === 0 && (
                  <tr>
                    <td className="td text-slate-400" colSpan={4}>
                      Nothing pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Pending Purchase Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">PO #</th>
                  <th className="th">Customer</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.pending_pos ?? []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link
                        href={`/purchase-orders/${p.id}`}
                        className="font-medium text-arus-purple hover:underline"
                      >
                        {p.po_number}
                      </Link>
                    </td>
                    <td className="td truncate">
                      {p.customers?.hospital_name ?? "—"}
                    </td>
                    <td className="td">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
                          p.status
                        )}`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap text-right">
                      {formatMYR(p.total_amount)}
                    </td>
                  </tr>
                ))}
                {(data?.pending_pos ?? []).length === 0 && (
                  <tr>
                    <td className="td text-slate-400" colSpan={4}>
                      Nothing pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {role === "director" && (
        <DirectorPanel
          funnel={data?.funnel}
          bottleneck={data?.bottleneck ?? []}
          byRep={data?.by_rep ?? []}
          byRegion={data?.by_region ?? []}
          summary={s}
        />
      )}
    </div>
  );
}
