"use client";

import { formatMYR } from "@/lib/format";

type Row = {
  name: string;
  value: number;
  sub?: string;
  marginPct?: number | null;
};

/**
 * Horizontal bar list — a more visual replacement for a ranked table. Bar
 * width is proportional to the top value; the amount and an optional sub-label
 * sit alongside.
 */
export default function BarList({
  rows,
  limit = 10,
  color = "#F26522",
  emptyLabel = "No data for this period.",
}: {
  rows: Row[];
  limit?: number;
  color?: string;
  emptyLabel?: string;
}) {
  const top = rows.slice(0, limit);
  const max = Math.max(1, ...top.map((r) => r.value));

  if (!top.length)
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;

  return (
    <div className="space-y-2.5">
      {top.map((r, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm text-slate-700" title={r.name}>
              <span className="mr-1.5 text-xs font-semibold text-slate-400">
                {i + 1}
              </span>
              {r.name}
            </span>
            <span className="shrink-0 text-sm font-semibold text-slate-900">
              {formatMYR(r.value)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.value / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            {(r.sub || r.marginPct != null) && (
              <span className="shrink-0 text-xs text-slate-400">
                {r.sub}
                {r.marginPct != null && ` · ${r.marginPct}% mgn`}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
