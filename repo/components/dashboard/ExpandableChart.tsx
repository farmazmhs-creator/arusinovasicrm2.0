"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Card wrapper that shows a compact chart with an expand button. Clicking the
 * button (or the card header) opens a large modal that can reveal deeper
 * layers — a Pareto view, a breakdown, a bigger version of the same chart.
 */
export default function ExpandableChart({
  title,
  subtitle,
  children,
  detail,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Extra content shown only in the expanded modal (Pareto, breakdown…). */
  detail?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className={`card ${className}`}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setOpen(true)}
            title="Expand for detail"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-arus-purple"
          >
            <Maximize2 style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-4 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Big version of the chart */}
            <div className="mb-6">{children}</div>

            {/* Deeper layers */}
            {detail}
          </div>
        </div>
      )}
    </>
  );
}
