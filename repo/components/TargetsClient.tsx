"use client";

import { useCallback, useEffect, useState } from "react";
import { Target, Check, Loader2 } from "lucide-react";
import { formatMYR } from "@/lib/format";

type Rep = { id: string; name: string; code: string; target: number };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TargetsClient() {
  const [month, setMonth] = useState(currentMonth());
  const [company, setCompany] = useState<string>("");
  const [reps, setReps] = useState<Rep[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    const res = await fetch(`/api/targets?month=${month}`);
    const j = await res.json();
    setCompany(String(j.company_target ?? 0));
    setReps(j.reps ?? []);
    const d: Record<string, string> = {};
    (j.reps ?? []).forEach((r: Rep) => (d[r.id] = String(r.target ?? 0)));
    setDraft(d);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const periodStart = `${month}-01`;

  async function saveOne(rep_id: string | null, amount: string) {
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rep_id,
        period_start: periodStart,
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

  const repTotal = reps.reduce((a, r) => a + Number(draft[r.id] || 0), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Target style={{ width: 22, height: 22 }} className="text-arus-purple" />
            Targets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set the company and each rep&apos;s monthly target. Reps see these
            read-only on their dashboard.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Month</label>
            <input
              type="month"
              className="input h-10 w-auto"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
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
      </div>

      {loading ? (
        <div className="card text-sm text-slate-400">Loading targets…</div>
      ) : (
        <div className="space-y-4">
          {/* Company target */}
          <div className="card">
            <label className="label">Company target ({month})</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">RM</span>
              <input
                type="number"
                min={0}
                className="input h-10 w-48"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <span className="text-xs text-slate-400">
                Reps combined: {formatMYR(repTotal)}
                {Number(company) > 0 &&
                  ` · ${((repTotal / Number(company)) * 100).toFixed(0)}% of company`}
              </span>
            </div>
          </div>

          {/* Per-rep targets */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Per-rep targets
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="th">Rep</th>
                    <th className="th">Code</th>
                    <th className="th text-right">Monthly target (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reps.map((r) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
