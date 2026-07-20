import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, total_amount, delivery_due, created_at, customers(name, hospital_name)"
    )
    .order("delivery_due", { ascending: true, nullsFirst: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

type IncomingItem = {
  product_id: string;
  quantity_ordered: number;
  unit_price: number;
};

/** Ops raises a new PO. Line costs are snapshotted by a DB trigger. */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  if (!body.customer_id) {
    return NextResponse.json(
      { error: "customer_id is required" },
      { status: 400 }
    );
  }

  const items: IncomingItem[] = (body.items ?? []).filter(
    (it: IncomingItem) => it.product_id && it.quantity_ordered > 0
  );

  const total = items.reduce(
    (s, it) => s + Number(it.quantity_ordered) * Number(it.unit_price),
    0
  );

  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true });
  const poNumber =
    body.po_number || `PO-2026-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: poNumber,
      quotation_id: body.quotation_id || null,
      customer_id: body.customer_id,
      status: body.status ?? "pending",
      total_amount: body.total_amount ?? Math.round(total * 100) / 100,
      delivery_due: body.delivery_due || null,
    })
    .select("id")
    .single();

  if (error || !data)
    return NextResponse.json(
      { error: error?.message ?? "Failed to create PO" },
      { status: 500 }
    );

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from("po_items").insert(
      items.map((it) => ({
        po_id: data.id,
        product_id: it.product_id,
        quantity_ordered: Number(it.quantity_ordered),
        quantity_delivered: 0,
        unit_price: Number(it.unit_price),
      }))
    );
    if (itemsErr)
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, po_number: poNumber });
}
