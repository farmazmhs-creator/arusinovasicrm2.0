import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quotations")
    .select(
      "*, customers(name, hospital_name), sales_reps(name, code), quotation_items(*, products(name, sku))"
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

/** Status changes here trigger automatic timestamping, status history
 *  logging and inventory flag creation in the database. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") patch.status = body.status;
  if (body.hold_note !== undefined) patch.hold_note = body.hold_note || null;
  if (body.external_ref !== undefined) patch.external_ref = body.external_ref;
  if (body.received_at !== undefined) patch.received_at = body.received_at;
  if (body.discount_pct !== undefined)
    patch.discount_pct = Number(body.discount_pct);
  if (body.total_amount !== undefined)
    patch.total_amount = Number(body.total_amount);

  const { data, error } = await supabase
    .from("quotations")
    .update(patch)
    .eq("id", id)
    .select("id, status, completed_at, sent_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** Soft delete: mark the request cancelled. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("quotations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
