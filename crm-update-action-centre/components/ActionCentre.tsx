"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  X,
  MoreHorizontal,
} from "lucide-react";
import { formatMYR } from "@/lib/format";

type Item = {
  code: string;
  label: string;
  description: string;
  owner_role: string;
  severity: "red" | "amber" | "green";
  age_days: number;
  direction: "ageing" | "countdown";
  source_type: string;
  source_id: string;
  ref: string;
  party: string | null;
  value: number | null;
  rep_name: string | null;
  extra: string | null;
};

/** "11 days waiting" reads as action. "raised on 3 July" does not. */
function ageLabel(it: Item) {
  const d = Math.round(Number(it.age_days));
  if (it.direction === "countdown")
    return d <= 0 ? "expired" : `${d} day${d === 1 ? "" : "s"} left`;
  if (d <= 0) return "today";
  return `${d} day${d === 1 ? "" : "s"}`;
}

const DOT: Record<string, string> = {
  red: "bg-rose-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
};

function linkFor(it: Item) {
  if (it.source_type === "quotation") return `/quotations/${it.source_id}`;
  if (it.source_type === "purchase_order")
    return `/purchase-orders/${it.source_id}`;
  return "/pricebook";
}

function Row({
  it,
  onAct,
  busy,
}: {
  it: Item;
  onAct: (it: Item, action: string, days?: number) => void;
  busy: boolean;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[it.severity]}`} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-slate-800">{it.label}</span>
          <Link
            href={linkFor(it)}
            className="text-sm font-semibold text-arus-purple hover:underline"
          >
            {it.ref}
          </Link>
        </div>
        <p className="truncate text-xs text-slate-500">
          {it.party ?? "—"}
          {it.rep_name ? ` · ${it.rep_name}` : ""}
          {it.extra ? ` · ${it.extra}` : ""}
        </p>
      </div>

      {it.value ? (
        <span className="hidden shrink-0 text-sm text-slate-600 sm:block">
          {formatMYR(it.value)}
        </span>
      ) : null}

      <span
        className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
          it.severity === "red"
            ? "text-rose-600"
            : it.severity === "amber"
            ? "text-amber-600"
            : "text-slate-500"
        }`}
      >
        {ageLabel(it)}
      </span>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenu(!menu)}
          disabled={busy}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Actions"
        >
          <MoreHorizontal style={{ width: 16, height: 16 }} />
        </button>
        {menu && (
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {[
              ["Mark done", "done", undefined],
              ["Snooze 3 days", "snooze", 3],
              ["Snooze 1 week", "snooze", 7],
              ["Not relevant", "dismiss", undefined],
            ].map(([label, action, days]) => (
              <button
                key={String(label)}
                onClick={() => {
                  setMenu(false);
                  onAct(it, action as string, days as number | undefined);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
  count,
}: {
  title: string;
  subtitle: string;
  icon: any;
  tone: string;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className={`rounded-lg p-2 ${tone}`}>
          <Icon style={{ width: 16, height: 16 }} />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-800">
            {title}{" "}
            <span className="ml-1 font-normal text-slate-400">({count})</span>
          </h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {count === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">
          Nothing here — good.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export default function ActionCentre({ name }: { name: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nt, setNt] = useState({ title: "", detail: "", owner_role: "ops", due_date: "" });
  const [showAllRules, setShowAllRules] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/action-items");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(it: Item, action: string, days?: number) {
    setBusy(it.source_id + it.code);
    await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule_code: it.code,
        source_id: it.source_id,
        action,
        days,
      }),
    });
    setBusy(null);
    load();
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!nt.title.trim()) return;
    await fetch("/api/action-items/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nt),
    });
    setNt({ title: "", detail: "", owner_role: "ops", due_date: "" });
    setShowAdd(false);
    load();
  }

  async function doneManual(id: string) {
    await fetch("/api/action-items/manual", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const items: Item[] = data?.items ?? [];
  const role = data?.role ?? "sales_rep";
  const manual = data?.manual ?? [];

  const mine = items.filter((i) => i.owner_role === role);
  const others = items.filter((i) => i.owner_role !== role);

  // Long rules (like stale pricing) collapse to 5 unless expanded
  function grouped(list: Item[]) {
    const by: Record<string, Item[]> = {};
    list.forEach((i) => (by[i.code] = [...(by[i.code] ?? []), i]));
    const out: Item[] = [];
    Object.entries(by).forEach(([code, arr]) => {
      out.push(...(showAllRules[code] ? arr : arr.slice(0, 5)));
    });
    return { rows: out, by };
  }
  const otherGroups = grouped(others);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning, {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Checking what needs attention…"
              : data?.total === 0
              ? "Nothing needs chasing right now."
              : `${data?.total} open item${data?.total === 1 ? "" : "s"} · ${
                  data?.red ?? 0
                } urgent`}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          {showAdd ? (
            <>
              <X style={{ width: 15, height: 15 }} /> Cancel
            </>
          ) : (
            <>
              <Plus style={{ width: 15, height: 15 }} /> Add follow-up
            </>
          )}
        </button>
      </div>

      {data?.rep_unlinked && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your account isn&apos;t linked to a sales rep record yet, so nothing is
          showing. Ask an admin to match your profile name to your rep name.
        </p>
      )}

      {showAdd && (
        <form onSubmit={addManual} className="card mb-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label">What needs doing?</label>
              <input
                className="input"
                value={nt.title}
                onChange={(e) => setNt({ ...nt, title: e.target.value })}
                placeholder="e.g. Chase B.Braun for updated pricing"
              />
            </div>
            <div>
              <label className="label">Who</label>
              <select
                className="input"
                value={nt.owner_role}
                onChange={(e) => setNt({ ...nt, owner_role: e.target.value })}
              >
                <option value="ops">Ops</option>
                <option value="sales_rep">Sales</option>
                <option value="director">Director</option>
              </select>
            </div>
            <div>
              <label className="label">By when</label>
              <input
                type="date"
                className="input"
                value={nt.due_date}
                onChange={(e) => setNt({ ...nt, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-primary">Add</button>
          </div>
        </form>
      )}

      <Section
        title="Needs you"
        subtitle="Waiting on you or your team to act"
        icon={AlertTriangle}
        tone="bg-rose-50 text-rose-600"
        count={mine.length + manual.length}
      >
        {manual.map((m: any) => (
          <div
            key={m.id}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-arus-purple" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{m.title}</p>
              <p className="text-xs text-slate-500">
                Added by hand
                {m.due_date ? ` · due ${m.due_date}` : ""}
              </p>
            </div>
            <button
              onClick={() => doneManual(m.id)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Done
            </button>
          </div>
        ))}
        {mine.map((it) => (
          <Row
            key={it.code + it.source_id}
            it={it}
            onAct={act}
            busy={busy === it.source_id + it.code}
          />
        ))}
      </Section>

      <Section
        title="Waiting on others"
        subtitle="Someone else owes you something — chase if it goes red"
        icon={Clock}
        tone="bg-amber-50 text-amber-600"
        count={others.length}
      >
        {otherGroups.rows.map((it) => (
          <Row
            key={it.code + it.source_id}
            it={it}
            onAct={act}
            busy={busy === it.source_id + it.code}
          />
        ))}
        {Object.entries(otherGroups.by).map(([code, arr]) =>
          arr.length > 5 && !showAllRules[code] ? (
            <button
              key={code}
              onClick={() => setShowAllRules({ ...showAllRules, [code]: true })}
              className="block w-full border-t border-slate-100 px-4 py-2 text-center text-xs font-medium text-arus-purple hover:bg-slate-50"
            >
              Show {arr.length - 5} more · {arr[0].label}
            </button>
          ) : null
        )}
      </Section>

      <Section
        title="Moved today"
        subtitle="Progress since this morning"
        icon={CheckCircle2}
        tone="bg-emerald-50 text-emerald-600"
        count={(data?.moved_today ?? []).length}
      >
        {(data?.moved_today ?? []).map((m: any, i: number) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
          >
            <CheckCircle2
              style={{ width: 15, height: 15 }}
              className="shrink-0 text-emerald-500"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium">{m.ref}</span>{" "}
              <span className="text-slate-500">
                {m.party ? `· ${m.party} ` : ""}→ {String(m.detail).replace(/_/g, " ")}
              </span>
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}
