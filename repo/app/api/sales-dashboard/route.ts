import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sales dashboard data. Rep-scoping is enforced server-side:
 *   • sales_rep  → always scoped to their own rep record (cannot see others)
 *   • ops/director → company-wide by default; may drill into one rep via ?rep=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, email, name")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "sales_rep";
  const email = profile?.email ?? user.email ?? null;

  // Resolve this user's own rep record (by email).
  let selfRepId: string | null = null;
  if (email) {
    const { data: rep } = await supabase
      .from("sales_reps")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    selfRepId = rep?.id ?? null;
  }

  const nullify = (v: string | null) => (v && v !== "all" ? v : null);
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  const compare = searchParams.get("compare") || "none";
  const requestedRep = nullify(searchParams.get("rep"));

  // Enforce scoping: a rep can only ever see their own numbers.
  const effectiveRep =
    role === "sales_rep" ? selfRepId : requestedRep;

  const { data, error } = await supabase.rpc("get_sales_dashboard", {
    p_rep: effectiveRep,
    p_from: from,
    p_to: to,
    p_compare: compare,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...(data as object),
    _meta: { role, selfRepId, scopedRep: effectiveRep },
  });
}
