"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatMYR, formatMYRShort } from "@/lib/format";

/**
 * Pareto (80/20) chart: sorted bars + cumulative-% line. Shows the "vital few"
 * driving most of the value. Highlights the 80% cut line.
 */
function truncate(s: string, n = 12) {
  return s && s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function Pareto({
  rows,
  valueKey = "value",
  nameKey = "name",
  height = 320,
  limit = 10,
}: {
  rows: any[];
  valueKey?: string;
  nameKey?: string;
  height?: number;
  /** Only chart the top N bars (the "vital few"); labels get unreadable past ~10. */
  limit?: number;
}) {
  const sorted = [...rows]
    .map((r) => ({ name: String(r[nameKey] ?? ""), value: Number(r[valueKey] || 0) }))
    .sort((a, b) => b.value - a.value);
  // Cumulative % is against the FULL total so the line stays truthful even when
  // we only draw the top N bars.
  const total = sorted.reduce((a, r) => a + r.value, 0) || 1;
  let run = 0;
  const data = sorted.slice(0, limit).map((r) => {
    run += r.value;
    return { ...r, short: truncate(r.name), cum: (run / total) * 100 };
  });

  if (!data.length)
    return <p className="text-sm text-slate-400">No data to rank.</p>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => truncate(String(v), 12)}
          angle={-30}
          textAnchor="end"
          interval={0}
          height={72}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatMYRShort(v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(v: any, n: any) =>
            n === "Cumulative %"
              ? `${Number(v).toFixed(1)}%`
              : formatMYR(Number(v))
          }
        />
        <ReferenceLine
          yAxisId="right"
          y={80}
          stroke="#F26522"
          strokeDasharray="4 4"
          label={{ value: "80%", fontSize: 10, fill: "#F26522" }}
        />
        <Bar
          yAxisId="left"
          dataKey="value"
          name="Value"
          fill="#3B1053"
          radius={[3, 3, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cum"
          name="Cumulative %"
          stroke="#FDB813"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
