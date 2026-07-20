import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPEN_STATUSES = [
  "received",
  "in_progress",
  "on_hold_vendor",
  "on_hold_sales_rep",
  "on_hold_director",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  const nullify = (v: string | null) => (v && v !== "all" ? v : null);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rep = nullify(searchParams.get("rep"));
  const state = nullify(searchParams.get("state"));
  const customer = nullify(searchParams.get("customer"));
  const product = nullify(searchParams.get("product"));
  const supplier = nullify(searchParams.get("supplier"));
  const compare = searchParams.get("compare") || "none";

  const { data, error } = await supabase.rpc("get_dashboard", {
    p_from: from || null,
    p_to: to || null,
    p_rep: rep,
    p_state: state,
    p_customer: customer,
    p_product: product,
    p_supplier: supplier,
    p_compare: compare,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Pending lists honour EVERY filter, same as the charts above them.
  let pq = supabase
    .from("quotations")
    .select(
      "id, quote_number, status, total_amount, received_at, customers!inner(hospital_name, state), sales_reps(name)"
    )
    .in("status", OPEN_STATUSES)
    .order("received_at", { ascending: true })
    .limit(15);

  if (from) pq = pq.gte("received_at", from);
  if (to) pq = pq.lt("received_at", to);
  if (rep) pq = pq.eq("sales_rep_id", rep);
  if (customer) pq = pq.eq("customer_id", customer);
  if (state) pq = pq.eq("customers.state", state);

  let pp = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, total_amount, delivery_due, created_at, customers!inner(hospital_name, state)"
    )
    .in("status", ["pending", "partial", "received"])
    .order("delivery_due", { ascending: true, nullsFirst: false })
    .limit(15);

  if (from) pp = pp.gte("created_at", from);
  if (to) pp = pp.lt("created_at", to);
  if (customer) pp = pp.eq("customer_id", customer);
  if (state) pp = pp.eq("customers.state", state);

  const [{ data: pendingQuotes }, { data: pendingPos }] = await Promise.all([
    pq,
    pp,
  ]);

  return NextResponse.json({
    ...(data as object),
    pending_quotes: pendingQuotes ?? [],
    pending_pos: pendingPos ?? [],
  });
}
