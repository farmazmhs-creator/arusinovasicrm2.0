"use client";

import { useMemo, useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  SlidersHorizontal,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import { formatMYR } from "@/lib/format";

/**
 * Targets setup wizard — the director is PROMPTED through every decision:
 *
 *   1. Year            — which year we're planning (2026 for now).
 *   2. Split           — Equal (one company total, divided evenly) or
 *                        Custom (a yearly amount per rep).
 *   3. Spread          — Uniform (÷12) or Seasonality. If Seasonality, the
 *                        director also chooses the LEVEL (Company / Region /
 *                        Rep) and paints the monthly shape.
 *   4. Review          — the full per-rep monthly cascade, then Save.
 *
 * Output is always per-rep MONTHLY rows (the dashboard's single source of
 * truth). Company + region figures are roll-ups of those rows.
 */

export type WizRep = {
  id: string;
  name: string;
  code: string;
  region: string | null;
  target?: number;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const pad = (n: number) => String(n).padStart(2, "0");

type SplitMode = "equal" | "custom";
type Spread = "uniform" | "seasonality";
type Level = "company" | "region" | "rep";

const PRESETS: { key: string; label: string; hint: string; w: number[] }[] = [
  { key: "flat", label: "Flat", hint: "Even every month", w: Array(12).fill(100) },
  {
    key: "q4",
    label: "Q4 Push",
    hint: "Ramps into year-end",
    w: [80, 80, 90, 90, 95, 95, 100, 100, 110, 130, 140, 150],
  },
  {
    key: "h2",
    label: "H2 Weighted",
    hint: "Second half heavier",
    w: [75, 75, 80, 85, 90, 95, 110, 115, 120, 125, 130, 135],
  },
  {
    key: "h1",
    label: "H1 Weighted",
    hint: "Front-loaded",
    w: [140, 135, 130, 120, 110, 100, 90, 85, 80, 75, 70, 65],
  },
  {
    key: "midyear",
    label: "Mid-year Peak",
    hint: "Peaks around Jun–Jul",
    w: [70, 80, 95, 110, 125, 140, 140, 125, 110, 95, 80, 70],
  },
];

const flat = () => Array(12).fill(100);

function normalize(w: number[]) {
  const sum = w.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  return w.map((x) => Math.max(0, x) / sum);
}

/** Distribute `total` across weights, whole RM, remainder absorbed by last month. */
function cascade(total: number, weights: number[]) {
  const nw = normalize(weights);
  const raw = nw.map((f) => total * f);
  const rounded = raw.map((x) => Math.round(x));
  const drift = Math.round(total) - rounded.reduce((a, b) => a + b, 0);
  // Put the rounding drift on the largest month so it's least noticeable.
  if (drift !== 0) {
    let idx = 0;
    for (let i = 1; i < 12; i++) if (rounded[i] > rounded[idx]) idx = i;
    rounded[idx] += drift;
  }
  return rounded;
}

function Bars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-full rounded-sm bg-arus-purple/80"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          title={`${MONTHS[i]}: ${v}`}
        />
      ))}
    </div>
  );
}

export default function TargetsWizard({
  reps,
  year,
  onClose,
  onSaved,
}: {
  reps: WizRep[];
  year: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 2 — split
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [companyYearly, setCompanyYearly] = useState("");
  const [repYearly, setRepYearly] = useState<Record<string, string>>({});

  // Step 3 — spread
  const [spread, setSpread] = useState<Spread>("uniform");
  const [level, setLevel] = useState<Level>("company");
  const [companyShape, setCompanyShape] = useState<number[]>(flat());
  const [regionShape, setRegionShape] = useState<Record<string, number[]>>({});
  const [repShape, setRepShape] = useState<Record<string, number[]>>({});

  const regions = useMemo(
    () => Array.from(new Set(reps.map((r) => r.region || "—"))).sort(),
    [reps]
  );

  // ---- Derived: yearly amount per rep -------------------------------------
  const yearlyByRep = useMemo(() => {
    const out: Record<string, number> = {};
    if (splitMode === "equal") {
      const total = Math.round(Number(companyYearly || 0));
      const base = Math.floor(total / (reps.length || 1));
      let rem = total - base * reps.length;
      reps.forEach((r) => {
        out[r.id] = base + (rem-- > 0 ? 1 : 0);
      });
    } else {
      reps.forEach((r) => (out[r.id] = Math.round(Number(repYearly[r.id] || 0))));
    }
    return out;
  }, [splitMode, companyYearly, repYearly, reps]);

  const companyTotal = useMemo(
    () => Object.values(yearlyByRep).reduce((a, b) => a + b, 0),
    [yearlyByRep]
  );

  // ---- Derived: weight vector per rep -------------------------------------
  function weightsFor(rep: WizRep): number[] {
    if (spread === "uniform") return flat();
    if (level === "company") return companyShape;
    if (level === "region") return regionShape[rep.region || "—"] || flat();
    return repShape[rep.id] || flat();
  }

  // ---- Derived: full monthly cascade per rep ------------------------------
  const monthlyByRep = useMemo(() => {
    const out: Record<string, number[]> = {};
    reps.forEach((r) => (out[r.id] = cascade(yearlyByRep[r.id] || 0, weightsFor(r))));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reps, yearlyByRep, spread, level, companyShape, regionShape, repShape]);

  const companyMonthly = useMemo(() => {
    const acc = Array(12).fill(0);
    reps.forEach((r) => monthlyByRep[r.id]?.forEach((v, i) => (acc[i] += v)));
    return acc;
  }, [reps, monthlyByRep]);

  // ---- Validation for Next ------------------------------------------------
  const canLeaveSplit =
    splitMode === "equal"
      ? Number(companyYearly || 0) > 0
      : companyTotal > 0;

  // ---- Save ---------------------------------------------------------------
  async function save() {
    setSaving(true);
    setErr(null);
    const rows: { rep_id: string; period_start: string; amount: number }[] = [];
    reps.forEach((r) =>
      monthlyByRep[r.id].forEach((amt, i) =>
        rows.push({ rep_id: r.id, period_start: `${year}-${pad(i + 1)}-01`, amount: amt })
      )
    );
    const res = await fetch("/api/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, rows }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Save failed");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  const steps = ["Year", "Split", "Spread", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        {/* Header + stepper */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-arus-purple p-2 text-arus-amber">
              <Sparkles style={{ width: 16, height: 16 }} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Set targets for your team · {year}
              </h2>
              <p className="text-xs text-slate-500">
                Step {step} of 4 — {steps[step - 1]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 <= step ? "bg-arus-purple" : "bg-slate-150 bg-slate-100"
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5">
          {/* STEP 1 — YEAR */}
          {step === 1 && (
            <div>
              <StepTitle
                icon={<CalendarRange style={{ width: 16, height: 16 }} />}
                title="Which year are we planning?"
                sub="You're setting the full-year plan. Monthly rows are generated for every rep."
              />
              <div className="mt-4 rounded-xl border border-arus-purple/30 bg-arus-purple/5 p-4">
                <p className="text-2xl font-bold text-arus-purple">{year}</p>
                <p className="mt-1 text-xs text-slate-500">
                  When {year + 1} comes around you'll be able to copy this plan
                  forward (optionally uplifted by a %) instead of starting over.
                </p>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Planning for <b>{reps.length}</b> active reps across{" "}
                <b>{regions.length}</b> regions.
              </p>
            </div>
          )}

          {/* STEP 2 — SPLIT */}
          {step === 2 && (
            <div>
              <StepTitle
                icon={<Users style={{ width: 16, height: 16 }} />}
                title="How should the yearly number be split across reps?"
                sub="Equal divides one company total evenly. Custom lets you set each rep."
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ChoiceCard
                  active={splitMode === "equal"}
                  onClick={() => setSplitMode("equal")}
                  title="Equal"
                  desc="One company total, divided evenly across all reps."
                />
                <ChoiceCard
                  active={splitMode === "custom"}
                  onClick={() => setSplitMode("custom")}
                  title="Custom"
                  desc="Type a yearly target for each rep individually."
                />
              </div>

              {splitMode === "equal" ? (
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <label className="label">Company yearly target ({year})</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">RM</span>
                    <input
                      type="number"
                      min={0}
                      autoFocus
                      className="input h-10 w-56"
                      value={companyYearly}
                      onChange={(e) => setCompanyYearly(e.target.value)}
                      placeholder="e.g. 2400000"
                    />
                  </div>
                  {Number(companyYearly || 0) > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      ≈ {formatMYR(Math.round(Number(companyYearly) / (reps.length || 1)))}{" "}
                      per rep / year ·{" "}
                      {formatMYR(
                        Math.round(Number(companyYearly) / (reps.length || 1) / 12)
                      )}{" "}
                      per rep / month
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Rep</th>
                        <th className="th">Region</th>
                        <th className="th text-right">Yearly (RM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reps.map((r) => (
                        <tr key={r.id}>
                          <td className="td font-medium text-slate-800">{r.name}</td>
                          <td className="td text-slate-500">{r.region || "—"}</td>
                          <td className="td text-right">
                            <input
                              type="number"
                              min={0}
                              className="input h-9 w-36 text-right"
                              value={repYearly[r.id] ?? ""}
                              onChange={(e) =>
                                setRepYearly({ ...repYearly, [r.id]: e.target.value })
                              }
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                        <td className="td" colSpan={2}>
                          Company total
                        </td>
                        <td className="td text-right">{formatMYR(companyTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — SPREAD */}
          {step === 3 && (
            <div>
              <StepTitle
                icon={<SlidersHorizontal style={{ width: 16, height: 16 }} />}
                title="How should each rep's year be spread across the months?"
                sub="Uniform is a flat ÷12. Seasonality lets you shape the monthly curve."
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ChoiceCard
                  active={spread === "uniform"}
                  onClick={() => setSpread("uniform")}
                  title="Uniform"
                  desc="Every month gets an equal share of the yearly target."
                />
                <ChoiceCard
                  active={spread === "seasonality"}
                  onClick={() => setSpread("seasonality")}
                  title="Seasonality"
                  desc="Shape the curve — heavier quarters, year-end push, etc."
                />
              </div>

              {spread === "seasonality" && (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="label">Apply the shape at which level?</label>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      {(["company", "region", "rep"] as Level[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => setLevel(l)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                            level === l
                              ? "bg-arus-purple text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {level === "company" &&
                        "One curve applied to every rep."}
                      {level === "region" &&
                        "A separate curve per region — reps inherit their region's shape."}
                      {level === "rep" && "A bespoke curve for each rep."}
                    </p>
                  </div>

                  {level === "company" && (
                    <ShapeEditor
                      weights={companyShape}
                      onChange={setCompanyShape}
                      title="Company seasonal shape"
                    />
                  )}

                  {level === "region" && (
                    <MultiShapeEditor
                      keys={regions}
                      shapes={regionShape}
                      setShapes={setRegionShape}
                      labelFor={(k) => k}
                    />
                  )}

                  {level === "rep" && (
                    <MultiShapeEditor
                      keys={reps.map((r) => r.id)}
                      shapes={repShape}
                      setShapes={setRepShape}
                      labelFor={(id) => {
                        const r = reps.find((x) => x.id === id);
                        return r ? `${r.name} (${r.region || "—"})` : id;
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — REVIEW */}
          {step === 4 && (
            <div>
              <StepTitle
                icon={<Check style={{ width: 16, height: 16 }} />}
                title="Review the monthly cascade"
                sub="This is exactly what gets saved — per-rep monthly rows the dashboard reads."
              />
              <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-arus-purple/30 bg-arus-purple/5 p-4">
                <Stat label="Company / year" value={formatMYR(companyTotal)} />
                <Stat label="Reps" value={String(reps.length)} />
                <Stat
                  label="Split"
                  value={splitMode === "equal" ? "Equal" : "Custom"}
                />
                <Stat
                  label="Spread"
                  value={
                    spread === "uniform"
                      ? "Uniform"
                      : `Seasonality · ${level}`
                  }
                />
              </div>

              <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="th">Rep</th>
                      <th className="th">Shape</th>
                      <th className="th text-right">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reps.map((r) => (
                      <tr key={r.id}>
                        <td className="td">
                          <div className="font-medium text-slate-800">{r.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {r.region || "—"}
                          </div>
                        </td>
                        <td className="td w-40">
                          <Bars values={monthlyByRep[r.id]} />
                        </td>
                        <td className="td text-right font-semibold text-slate-700">
                          {formatMYR(yearlyByRep[r.id] || 0)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="td font-semibold text-slate-800">Company</td>
                      <td className="td w-40">
                        <Bars values={companyMonthly} />
                      </td>
                      <td className="td text-right font-bold text-arus-purple">
                        {formatMYR(companyTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {err && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {err}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !canLeaveSplit}
              className="btn-primary h-10 disabled:opacity-40"
            >
              Continue
              <ArrowRight style={{ width: 15, height: 15 }} />
            </button>
          ) : (
            <button
              onClick={save}
              disabled={saving || companyTotal <= 0}
              className="btn-primary h-10 disabled:opacity-40"
            >
              {saving ? (
                <>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check style={{ width: 16, height: 16 }} />
                  Save {year} targets
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- small pieces ----------------------------- */

function StepTitle({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-arus-purple">
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-arus-purple bg-arus-purple/5 ring-1 ring-arus-purple"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
            active ? "border-arus-purple bg-arus-purple" : "border-slate-300"
          }`}
        >
          {active && <Check style={{ width: 11, height: 11 }} className="text-white" />}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

/** A single 12-month shape editor with presets + relative-weight inputs. */
function ShapeEditor({
  weights,
  onChange,
  title,
}: {
  weights: number[];
  onChange: (w: number[]) => void;
  title?: string;
}) {
  const nw = normalize(weights);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      {title && (
        <p className="mb-2 text-xs font-semibold text-slate-700">{title}</p>
      )}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onChange([...p.w])}
            title={p.hint}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            {p.label}
          </button>
        ))}
      </div>
      <Bars values={weights} />
      <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
        {weights.map((w, i) => (
          <div key={i} className="text-center">
            <div className="text-[10px] text-slate-400">{MONTHS[i]}</div>
            <input
              type="number"
              min={0}
              className="input h-8 w-full px-1 text-center text-xs"
              value={w}
              onChange={(e) => {
                const next = [...weights];
                next[i] = Number(e.target.value);
                onChange(next);
              }}
            />
            <div className="text-[9px] text-slate-400">
              {(nw[i] * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Editor for many entities (regions or reps): pick one, shape it, copy to all. */
function MultiShapeEditor({
  keys,
  shapes,
  setShapes,
  labelFor,
}: {
  keys: string[];
  shapes: Record<string, number[]>;
  setShapes: (s: Record<string, number[]>) => void;
  labelFor: (k: string) => string;
}) {
  const [sel, setSel] = useState(keys[0] ?? "");
  const current = shapes[sel] || flat();

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="input h-9 w-auto max-w-xs"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {labelFor(k)}
              {shapes[k] ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const next = { ...shapes };
            keys.forEach((k) => (next[k] = [...current]));
            setShapes(next);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Copy this shape to all
        </button>
      </div>
      <ShapeEditor
        weights={current}
        onChange={(w) => setShapes({ ...shapes, [sel]: w })}
      />
      <p className="mt-2 text-[11px] text-slate-400">
        Anything you don't shape falls back to a flat curve.
      </p>
    </div>
  );
}
