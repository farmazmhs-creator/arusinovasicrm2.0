import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Director-only management of monthly targets (company + per rep). */

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

/** GET ?month=YYYY-MM → company target + every active rep's target for that month. */
export async function GET(request: Request) {
  const { supabase, error } = await requireDirector();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const ym =
    month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = `${ym}-01`;

  const [{ data: reps }, { data: targets }] = await Promise.all([
    supabase
      .from("sales_reps")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("sales_targets")
      .select("rep_id, scope, target_amount")
      .eq("period_type", "month")
      .eq("period_start", periodStart),
  ]);

  const byRep = new Map<string, number>();
  let company = 0;
  (targets ?? []).forEach((t) => {
    if (t.scope === "company") company = Number(t.target_amount);
    else if (t.rep_id) byRep.set(t.rep_id, Number(t.target_amount));
  });

  return NextResponse.json({
    month: ym,
    period_start: periodStart,
    company_target: company,
    reps: (reps ?? []).map((r) => ({
      ...r,
      target: byRep.get(r.id) ?? 0,
    })),
  });
}

/** POST { rep_id?: uuid|null, period_start: 'YYYY-MM-01', amount: number } — upsert one target. */
export async function POST(request: Request) {
  const { supabase, error } = await requireDirector();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const body = await request.json();
  const periodStart: string | undefined = body.period_start;
  const amount = Number(body.amount);
  const repId: string | null = body.rep_id ?? null;
  if (!periodStart || Number.isNaN(amount) || amount < 0)
    return NextResponse.json(
      { error: "period_start and a non-negative amount are required" },
      { status: 400 }
    );

  const scope = repId ? "rep" : "company";

  // Update the existing row for this (scope, rep, month) or insert a new one.
  let find = supabase
    .from("sales_targets")
    .select("id")
    .eq("scope", scope)
    .eq("period_type", "month")
    .eq("period_start", periodStart);
  find = repId ? find.eq("rep_id", repId) : find.is("rep_id", null);
  const { data: existing } = await find.maybeSingle();

  if (existing) {
    const { error: e } = await supabase
      .from("sales_targets")
      .update({ target_amount: amount })
      .eq("id", existing.id);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  } else {
    const { error: e } = await supabase.from("sales_targets").insert({
      scope,
      rep_id: repId,
      period_type: "month",
      period_start: periodStart,
      target_amount: amount,
    });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
