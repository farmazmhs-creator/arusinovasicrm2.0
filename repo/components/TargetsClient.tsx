"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Target, Check, Loader2, Scale, Split } from "lucide-react";
import { formatMYR } from "@/lib/format";

type Rep = { id: string; name: string; code: string; target: number };
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
  const [reps, setReps] = useState<Rep[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    const res = await fetch(
      `/api/targets?granularity=${gran}&periodStart=${periodStart}`
    );
    const j = await res.json();
    setCompany(String(Math.round(j.company_target ?? 0)));
    setReps(j.reps ?? []);
    const d: Record<string, string> = {};
    (j.reps ?? []).forEach((r: Rep) => (d[r.id] = String(Math.round(r.target ?? 0))));
    setDraft(d);
    setLoading(false);
  }, [gran, periodStart]);

  useEffect(() => {
    load();
  }, [load]);

  const repTotal = reps.reduce((a, r) => a + Number(draft[r.id] || 0), 0);
  const companyNum = Number(company || 0);
  const diff = companyNum - repTotal;
  const matched = Math.abs(diff) < 1;

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
    await saveOne(null, company);
    for (const r of reps) await saveOne(r.id, draft[r.id] ?? "0");
    setSaving(false);
    setSaved(true);
    load();
  }

  function companyEqualsReps() {
    setCompany(String(Math.round(repTotal)));
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
        <button onClick={saveAll} disabled={saving || loading} className="btn-primary h-10">
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
              onClick={companyEqualsReps}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Scale style={{ width: 13, height: 13 }} /> Company = reps total
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
            <label className="label">Company target · {periodLabel}</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">RM</span>
              <input
                type="number"
                min={0}
                className="input h-10 w-56"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
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
