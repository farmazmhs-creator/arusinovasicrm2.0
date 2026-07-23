import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The Action Centre feed.
 *
 * Sales reps see only what is blocked on them. Ops and directors see everything,
 * because they coordinate across the whole pipeline.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as string) ?? "sales_rep";

  // Link the logged-in user to their sales_reps record by name
  let repId: string | null = null;
  let repUnlinked = false;
  if (role === "sales_rep") {
    const { data: rep } = await supabase
      .from("sales_reps")
      .select("id")
      .ilike("name", profile?.name ?? "")
      .maybeSingle();
    repId = rep?.id ?? null;
    repUnlinked = !repId;
  }

  const { data, error } = await supabase.rpc("get_action_items", {
    p_role: role === "sales_rep" ? "sales_rep" : null,
    p_rep_id: repId,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // What moved today — the reassurance panel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const iso = todayStart.toISOString();

  const [{ data: quoteMoves }, { data: poMoves }, { data: manual }] =
    await Promise.all([
      supabase
        .from("quotation_status_history")
        .select("id, to_status, changed_at, quotations(quote_number, customers(hospital_name))")
        .gte("changed_at", iso)
        .order("changed_at", { ascending: false })
        .limit(20),
      supabase
        .from("purchase_orders")
        .select("id, po_number, status, delivered_at, customers(hospital_name)")
        .gte("delivered_at", iso)
        .limit(20),
      supabase
        .from("follow_ups_manual")
        .select("id, title, detail, owner_role, due_date, status, created_at")
        .eq("status", "open")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50),
    ]);

  return NextResponse.json({
    ...(data as object),
    role,
    rep_unlinked: repUnlinked,
    manual: manual ?? [],
    moved_today: [
      ...(quoteMoves ?? []).map((m: any) => ({
        kind: "quote",
        ref: m.quotations?.quote_number,
        party: m.quotations?.customers?.hospital_name,
        detail: m.to_status,
        at: m.changed_at,
      })),
      ...(poMoves ?? []).map((m: any) => ({
        kind: "po",
        ref: m.po_number,
        party: m.customers?.hospital_name,
        detail: "delivered",
        at: m.delivered_at,
      })),
    ],
  });
}

/** Snooze, complete or reopen a derived follow-up. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { rule_code, source_id, action, days, note } = body;
  if (!rule_code || !source_id || !action)
    return NextResponse.json(
      { error: "rule_code, source_id and action are required" },
      { status: 400 }
    );

  let status = "open";
  let snoozed_until: string | null = null;

  if (action === "snooze") {
    status = "snoozed";
    const d = new Date();
    d.setDate(d.getDate() + Number(days ?? 3));
    snoozed_until = d.toISOString();
  } else if (action === "done") {
    status = "done";
  } else if (action === "dismiss") {
    status = "dismissed";
  }

  const { error } = await supabase.from("follow_up_state").upsert(
    {
      rule_code,
      source_id,
      status,
      snoozed_until,
      note: note ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rule_code,source_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
