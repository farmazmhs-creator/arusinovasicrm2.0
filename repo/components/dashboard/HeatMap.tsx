"use client";

import { useMemo } from "react";
import { formatMYR, formatMYRShort } from "@/lib/format";

type Cell = { row: string; col: string; v: number };

/**
 * Generic value heatmap. Rows down the left, columns across the top, cell
 * colour scaled to the max value (Arus amber ramp). Rows are ordered by their
 * total descending; columns sort naturally (period labels sort lexically).
 */
export default function HeatMap({
  cells,
  maxRows = 12,
  rowLabel = "",
}: {
  cells: Cell[];
  maxRows?: number;
  rowLabel?: string;
}) {
  const { rows, cols, lookup, max } = useMemo(() => {
    const rowTotals = new Map<string, number>();
    const colSet = new Set<string>();
    const lk = new Map<string, number>();
    let mx = 0;
    for (const c of cells) {
      rowTotals.set(c.row, (rowTotals.get(c.row) || 0) + c.v);
      colSet.add(c.col);
      lk.set(`${c.row}|||${c.col}`, c.v);
      if (c.v > mx) mx = c.v;
    }
    const rows = [...rowTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxRows)
      .map((e) => e[0]);
    const cols = [...colSet].sort();
    return { rows, cols, lookup: lk, max: mx || 1 };
  }, [cells, maxRows]);

  if (!cells.length)
    return <p className="text-sm text-slate-400">No data for this period.</p>;

  const bg = (v: number) => {
    if (!v) return "transparent";
    const t = Math.min(1, v / max);
    // amber → orange ramp; alpha scales with intensity
    return `rgba(242, 101, 34, ${0.12 + t * 0.8})`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-2 py-1 text-left text-[11px] font-semibold text-slate-500">
              {rowLabel}
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-1 py-1 text-center text-[10px] font-medium text-slate-500"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-medium text-slate-700 whitespace-nowrap">
                {r}
              </td>
              {cols.map((c) => {
                const v = lookup.get(`${r}|||${c}`) || 0;
                const t = v / max;
                return (
                  <td
                    key={c}
                    title={`${r} · ${c}: ${formatMYR(v)}`}
                    className="h-9 min-w-[52px] rounded text-center text-[10px] font-medium"
                    style={{
                      backgroundColor: bg(v),
                      color: t > 0.55 ? "#fff" : "#64748b",
                    }}
                  >
                    {v ? formatMYRShort(v) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
        <span>Low</span>
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(242,101,34,0.12), rgba(242,101,34,0.92))",
          }}
        />
        <span>High · max {formatMYR(max)}</span>
      </div>
    </div>
  );
}
