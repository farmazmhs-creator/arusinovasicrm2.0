import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Director-only monthly/quarterly/yearly target management.
 *
 * Targets are ALWAYS persisted at monthly granularity (period_type='month'),
 * so the dashboard math stays simple. Quarter/Year are entry & view conveniences:
 * a yearly amount is split evenly across its 12 months, a quarterly across 3.
 */

async function requireDirector() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: 401 as const };
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "director") return { supabase, error: 403 as const };
  return { supabase, error: null };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** List of monthly period_start dates ('YYYY-MM-01') covered by a period. */
function monthsFor(granularity: string, periodStart: string): string[] {
  const [y, m] = periodStart.split("-").map(Number); // periodStart = first month YYYY-MM(-01)
  const count = granularity === "year" ? 12 : granularity === "quarter" ? 3 : 1;
  const startMonthIndex = granularity === "year" ? 0 : m - 1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, startMonthIndex + i, 1));
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`);
  }
  return out;
}

/** GET ?granularity=month|quarter|year&periodStart=YYYY-MM-01 */
export async function GET(request: Request) {
  const { supabase, error } = await requireDirector();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get("granularity") || "month";
  const now = new Date();
  const periodStart =
    searchParams.get("periodStart") ||
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const months = monthsFor(granularity, periodStart);

  const [{ data: reps }, { data: targets }] = await Promise.all([
    supabase
      .from("sales_reps")
      .select("id, name, code, region")
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("sales_targets")
      .select("rep_id, scope, target_amount, period_start")
      .eq("period_type", "month")
      .in("period_start", months),
  ]);

  const byRep = new Map<string, number>();
  let company = 0;
  (targets ?? []).forEach((t) => {
    const amt = Number(t.target_amount);
    if (t.scope === "company") company += amt;
    else if (t.rep_id) byRep.set(t.rep_id, (byRep.get(t.rep_id) ?? 0) + amt);
  });

  return NextResponse.json({
    granularity,
    periodStart,
    months,
    company_target: company,
    reps: (reps ?? []).map((r) => ({ ...r, target: byRep.get(r.id) ?? 0 })),
  });
}

/**
 * PUT — bulk writer used by the Targets setup wizard.
 *
 * Body: { year: number, rows: [{ rep_id, period_start:'YYYY-MM-01', amount }] }
 *
 * Writes the WHOLE year for the given reps at once (per-rep monthly rows, which
 * are the single source of truth the dashboard reads). It first clears every
 * rep + company monthly row inside that year, then inserts the supplied per-rep
 * monthly rows plus a company monthly roll-up (= sum of reps that month). This
 * lets the wizard express seasonality (different amount each month) which the
 * even-split POST cannot.
 */
export async function PUT(request: Request) {
  const { supabase, error } = await requireDirector();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const body = await request.json();
  const year = Number(body.year);
  const rows: { rep_id: string; period_start: string; amount: number }[] =
    Array.isArray(body.rows) ? body.rows : [];
  if (!year || !rows.length)
    return NextResponse.json(
      { error: "year and a non-empty rows[] are required" },
      { status: 400 }
    );

  // The 12 monthly period_start dates for this year.
  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${pad(i + 1)}-01`
  );

  // 1) Clear the whole year (rep + company monthly rows) for a clean rewrite.
  const { error: delErr } = await supabase
    .from("sales_targets")
    .delete()
    .eq("period_type", "month")
    .in("period_start", months);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // 2) Insert per-rep monthly rows (skip zeros to keep the table tidy).
  const repRows = rows
    .filter((r) => r.rep_id && r.period_start && Number(r.amount) > 0)
    .map((r) => ({
      scope: "rep",
      rep_id: r.rep_id,
      period_type: "month",
      period_start: r.period_start,
      target_amount: Math.round(Number(r.amount) * 100) / 100,
    }));

  // 3) Company monthly roll-up = sum of all reps that month.
  const companyByMonth = new Map<string, number>();
  repRows.forEach((r) =>
    companyByMonth.set(
      r.period_start,
      (companyByMonth.get(r.period_start) ?? 0) + r.target_amount
    )
  );
  const companyRows = Array.from(companyByMonth.entries()).map(
    ([period_start, amt]) => ({
      scope: "company",
      rep_id: null,
      period_type: "month",
      period_start,
      target_amount: Math.round(amt * 100) / 100,
    })
  );

  const all = [...repRows, ...companyRows];
  if (all.length) {
    const { error: insErr } = await supabase.from("sales_targets").insert(all);
    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    year,
    rep_rows: repRows.length,
    company_rows: companyRows.length,
  });
}

/** POST { rep_id?, granularity, periodStart, amount } — split across months, upsert each. */
export async function POST(request: Request) {
  const { supabase, error } = await requireDirector();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const body = await request.json();
  const granularity: string = body.granularity || "month";
  const periodStart: string | undefined = body.periodStart;
  const amount = Number(body.amount);
  const repId: string | null = body.rep_id ?? null;
  if (!periodStart || Number.isNaN(amount) || amount < 0)
    return NextResponse.json(
      { error: "periodStart and a non-negative amount are required" },
      { status: 400 }
    );

  const scope = repId ? "rep" : "company";
  const months = monthsFor(granularity, periodStart);
  const per = Math.round((amount / months.length) * 100) / 100;

  for (const mStart of months) {
    let find = supabase
      .from("sales_targets")
      .select("id")
      .eq("scope", scope)
      .eq("period_type", "month")
      .eq("period_start", mStart);
    find = repId ? find.eq("rep_id", repId) : find.is("rep_id", null);
    const { data: existing } = await find.maybeSingle();

    if (existing) {
      const { error: e } = await supabase
        .from("sales_targets")
        .update({ target_amount: per })
        .eq("id", existing.id);
      if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    } else {
      const { error: e } = await supabase.from("sales_targets").insert({
        scope,
        rep_id: repId,
        period_type: "month",
        period_start: mStart,
        target_amount: per,
      });
      if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, months: months.length });
}
