import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, customers(name, hospital_name), po_items(*, products(name, sku))")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

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
  if (body.delivery_due !== undefined) patch.delivery_due = body.delivery_due;
  if (body.delivered_at !== undefined) patch.delivered_at = body.delivered_at;
  if (body.total_amount !== undefined)
    patch.total_amount = Number(body.total_amount);

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(patch)
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
