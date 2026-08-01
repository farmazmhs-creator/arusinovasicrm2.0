"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Target,
  Check,
  Loader2,
  Split,
  RefreshCw,
  Wand2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatMYR } from "@/lib/format";
import TargetsWizard, { WizRep } from "./TargetsWizard";

function tier(p: number) {
  if (p >= 100) return { label: "Smashed it!", emoji: "🏆", color: "#0f9d6b" };
  if (p >= 80) return { label: "Almost there", emoji: "🥇", color: "#F26522" };
  if (p >= 50) return { label: "On the way", emoji: "🥈", color: "#e59a1c" };
  return { label: "Building up", emoji: "🥉", color: "#8a92a1" };
}

type Rep = {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  target: number;
};
type Gran = "month" | "quarter" | "year";

const pad = (n: number) => String(n).padStart(2, "0");
const GRANS: { key: Gran; label: string }[] = [
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "year", label: "Yearly" },
];

export default function TargetsClient() {
  const now = new Date();
  const [gran, setGran] = useState<Gran>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  );

  const [company, setCompany] = useState<string>("");
  const [companyAuto, setCompanyAuto] = useState(true); // company = sum of reps unless overridden
  const [reps, setReps] = useState<Rep[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [ach, setAch] = useState<any>(null); // live achievement for the period
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Wizard + blank-state detection (based on the target YEAR, not the editing period)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [yearChecked, setYearChecked] = useState(false);
  const [yearHasTargets, setYearHasTargets] = useState(false);
  const [yearReps, setYearReps] = useState<WizRep[]>([]);

  const checkYear = useCallback(async () => {
    setYearChecked(false);
    const res = await fetch(
      `/api/targets?granularity=year&periodStart=${year}-01-01`
    );
    const j = await res.json();
    const repList: WizRep[] = j.reps ?? [];
    const total =
      Number(j.company_target ?? 0) +
      repList.reduce((a, r) => a + Number(r.target ?? 0), 0);
    setYearReps(repList);
    setYearHasTargets(total > 0);
    setYearChecked(true);
  }, [year]);

  useEffect(() => {
    checkYear();
  }, [checkYear]);

  // First month of the selected period, as YYYY-MM-01.
  const periodStart = useMemo(() => {
    if (gran === "month") return `${month}-01`;
    if (gran === "quarter") return `${year}-${pad((quarter - 1) * 3 + 1)}-01`;
    return `${year}-01-01`;
  }, [gran, month, quarter, year]);

  const periodLabel = useMemo(() => {
    if (gran === "month")
      return new Date(`${month}-01`).toLocaleDateString("en-MY", {
        month: "long",
        year: "numeric",
      });
    if (gran === "quarter") return `Q${quarter} ${year}`;
    return `${year}`;
  }, [gran, month, quarter, year]);

  // End of the selected period (exclusive), for the achievement lookup.
  const periodEnd = useMemo(() => {
    const [y, m] = periodStart.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() + (gran === "year" ? 12 : gran === "quarter" ? 3 : 1));
    return d.toISOString();
  }, [periodStart, gran]);

  const load = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    const res = await fetch(
      `/api/targets?granularity=${gran}&periodStart=${periodStart}`
    );
    const j = await res.json();
    const loadedCompany = Math.round(j.company_target ?? 0);
    const repTotalLoaded = (j.reps ?? []).reduce(
      (a: number, r: Rep) => a + Math.round(r.target ?? 0),
      0
    );
    setCompany(String(loadedCompany));
    // Default to auto (= sum of reps) unless a distinct company override was saved.
    setCompanyAuto(loadedCompany === 0 || Math.abs(loadedCompany - repTotalLoaded) < 1);
    setReps(j.reps ?? []);
    const d: Record<string, string> = {};
    (j.reps ?? []).forEach((r: Rep) => (d[r.id] = String(Math.round(r.target ?? 0))));
    setDraft(d);
    setLoading(false);
  }, [gran, periodStart]);

  useEffect(() => {
    load();
  }, [load]);

  // Live achievement for the selected period (re-checks after a save).
  useEffect(() => {
    fetch(`/api/sales-dashboard?from=${new Date(periodStart).toISOString()}&to=${periodEnd}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAch(j?.summary ?? null))
      .catch(() => setAch(null));
  }, [periodStart, periodEnd, saved]);

  const repTotal = reps.reduce((a, r) => a + Number(draft[r.id] || 0), 0);
  // Company target auto-follows the sum of rep targets unless the director overrides it.
  const effectiveCompany = companyAuto ? repTotal : Number(company || 0);
  const companyNum = effectiveCompany;
  const diff = companyNum - repTotal;
  const matched = Math.abs(diff) < 1;

  // Gamified achievement vs the SAVED target for this period.
  const achieved = Number(ach?.revenue ?? 0);
  const achTarget = Number(ach?.target ?? 0);
  const achPct = achTarget > 0 ? (achieved / achTarget) * 100 : 0;
  const tr = tier(achPct);
  const achGap = Math.max(0, achTarget - achieved);

  async function saveOne(rep_id: string | null, amount: string) {
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rep_id,
        granularity: gran,
        periodStart,
        amount: Number(amount || 0),
      }),
    });
  }

  async function saveAll() {
    setSaving(true);
    setSaved(false);
    await saveOne(null, String(Math.round(effectiveCompany)));
    for (const r of reps) await saveOne(r.id, draft[r.id] ?? "0");
    setSaving(false);
    setSaved(true);
    load();
  }

  function splitCompanyToReps() {
    if (!reps.length) return;
    const each = Math.round(companyNum / reps.length);
    const d: Record<string, string> = {};
    reps.forEach((r) => (d[r.id] = String(each)));
    setDraft(d);
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

  return (
    <div>
      {wizardOpen && (
        <TargetsWizard
          reps={yearReps}
          year={year}
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            setWizardOpen(false);
            checkYear();
            load();
          }}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Target style={{ width: 22, height: 22 }} className="text-arus-purple" />
            Targets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set company and per-rep targets by month, quarter or year. Yearly and
            quarterly amounts are split evenly across their months. Reps see these
            read-only.
          </p>
        </div>
        {yearChecked && yearHasTargets && (
          <div className="flex gap-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-arus-purple/40 bg-arus-purple/5 px-4 text-sm font-medium text-arus-purple hover:bg-arus-purple/10"
            >
              <Wand2 style={{ width: 16, height: 16 }} />
              Re-run setup wizard
            </button>
            <button
              onClick={saveAll}
              disabled={saving || loading}
              className="btn-primary h-10"
            >
              {saving ? (
                <>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check style={{ width: 16, height: 16 }} />
                  Saved
                </>
              ) : (
                "Save all"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Blank state — no targets for this year yet */}
      {!yearChecked ? (
        <div className="card text-sm text-slate-400">Checking targets…</div>
      ) : !yearHasTargets ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 rounded-2xl bg-arus-purple/10 p-4 text-arus-purple">
            <Sparkles style={{ width: 32, height: 32 }} />
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            No targets set for {year} yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Let's set targets for your team. The wizard walks you through the
            yearly number, how it splits across reps, and how it spreads across
            the months — including seasonality by company, region or rep.
          </p>
          <button
            onClick={() => setWizardOpen(true)}
            className="btn-primary mt-6 h-11 px-6 text-base"
          >
            <Wand2 style={{ width: 18, height: 18 }} />
            Set targets now for your team
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      ) : (
      <div>
      {/* Period controls */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Granularity</label>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {GRANS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGran(g.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    gran === g.key
                      ? "bg-arus-purple text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {gran === "month" && (
            <div>
              <label className="label">Month</label>
              <input
                type="month"
                className="input h-10 w-auto"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}
          {gran === "quarter" && (
            <>
              <div>
                <label className="label">Quarter</label>
                <select
                  className="input h-10 w-auto"
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      Q{q}
                    </option>
                  ))}
                </select>
              </div>
              <YearSelect year={year} setYear={setYear} years={years} />
            </>
          )}
          {gran === "year" && <YearSelect year={year} setYear={setYear} years={years} />}

          <div className="text-sm text-slate-400">
            Editing: <span className="font-medium text-slate-600">{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* Gamified achievement mini-dashboard */}
      <div className="card mb-4 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Achievement · {periodLabel}
          </h3>
          <span className="text-[11px] text-slate-400">actual vs saved target</span>
        </div>
        {achTarget > 0 ? (
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${tr.color} ${Math.min(100, achPct)}%, #eef0f4 0)` }}
            >
              <span className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-xl font-bold" style={{ color: tr.color }}>
                  {achPct.toFixed(0)}%
                </span>
                <span className="text-[16px] leading-none">{tr.emoji}</span>
              </span>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="text-lg font-bold" style={{ color: tr.color }}>
                {tr.emoji} {tr.label}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                <b className="text-slate-900">{formatMYR(achieved)}</b> of{" "}
                {formatMYR(achTarget)}
              </p>
              <p className="text-xs text-slate-500">
                {achPct >= 100
                  ? `🎉 target beaten by ${formatMYR(achieved - achTarget)}`
                  : `${formatMYR(achGap)} to go`}
              </p>
              {/* Milestone bar */}
              <div className="relative mt-3 h-2.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, achPct)}%`, background: tr.color }}
                />
                {[25, 50, 75].map((mk) => (
                  <span
                    key={mk}
                    className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white"
                    style={{ left: `${mk}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No saved target for {periodLabel} yet — set targets below and Save to
            track achievement here.
          </p>
        )}
      </div>

      {/* Reconciliation */}
      <div
        className={`card mb-4 border ${
          matched ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold text-slate-800">Reconciliation ({periodLabel}):</span>{" "}
            reps total <span className="font-semibold">{formatMYR(repTotal)}</span> ·
            company <span className="font-semibold">{formatMYR(companyNum)}</span> ·{" "}
            {matched ? (
              <span className="font-semibold text-emerald-700">✓ matched</span>
            ) : (
              <span className="font-semibold text-amber-700">
                {diff > 0 ? "company exceeds reps by " : "reps exceed company by "}
                {formatMYR(Math.abs(diff))}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCompanyAuto(true)}
              disabled={companyAuto}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw style={{ width: 13, height: 13 }} /> Auto = sum of reps
            </button>
            <button
              onClick={splitCompanyToReps}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Split style={{ width: 13, height: 13 }} /> Split company → reps
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card text-sm text-slate-400">Loading targets…</div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0">Company target · {periodLabel}</label>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  companyAuto
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {companyAuto ? "Auto — sum of reps" : "Manual override"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">RM</span>
              <input
                type="number"
                min={0}
                className="input h-10 w-56"
                value={String(Math.round(effectiveCompany))}
                onChange={(e) => {
                  setCompanyAuto(false);
                  setCompany(e.target.value);
                }}
              />
              {companyAuto && (
                <span className="text-xs text-slate-400">
                  follows the {reps.length} rep targets — type to override
                </span>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Per-rep targets · {periodLabel}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="th">Rep</th>
                    <th className="th">Code</th>
                    <th className="th text-right">Target (RM)</th>
                    <th className="th text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reps.map((r) => {
                    const v = Number(draft[r.id] || 0);
                    const share = repTotal > 0 ? (v / repTotal) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="td font-medium text-slate-800">{r.name}</td>
                        <td className="td text-slate-500">{r.code}</td>
                        <td className="td text-right">
                          <input
                            type="number"
                            min={0}
                            className="input h-9 w-40 text-right"
                            value={draft[r.id] ?? "0"}
                            onChange={(e) =>
                              setDraft({ ...draft, [r.id]: e.target.value })
                            }
                          />
                        </td>
                        <td className="td text-right text-slate-500">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="td" colSpan={2}>
                      Reps total
                    </td>
                    <td className="td text-right">{formatMYR(repTotal)}</td>
                    <td className="td text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}

function YearSelect({
  year,
  setYear,
  years,
}: {
  year: number;
  setYear: (y: number) => void;
  years: number[];
}) {
  return (
    <div>
      <label className="label">Year</label>
      <select
        className="input h-10 w-auto"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
