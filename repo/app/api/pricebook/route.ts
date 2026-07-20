import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Vendor cost entries, newest first, with the product they price. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const supabase = await createClient();

  let query = supabase
    .from("product_costs")
    .select(
      "id, product_id, vendor_name, vendor_type, cost_price, currency, effective_from, valid_until, notes, created_at, products(name, sku, unit_price, supplier)"
    )
    .order("effective_from", { ascending: false })
    .limit(500);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data as any[]) ?? [];
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.products?.name?.toLowerCase().includes(needle) ||
        r.products?.sku?.toLowerCase().includes(needle) ||
        r.vendor_name?.toLowerCase().includes(needle)
    );
  }

  // Margin against the current selling price
  const withMargin = rows.map((r) => {
    const sell = Number(r.products?.unit_price ?? 0);
    const cost = Number(r.cost_price);
    return {
      ...r,
      sell_price: sell,
      margin: sell - cost,
      margin_pct: sell > 0 ? ((sell - cost) / sell) * 100 : null,
      active:
        new Date(r.effective_from) <= new Date() &&
        (!r.valid_until || new Date(r.valid_until) >= new Date()),
    };
  });

  return NextResponse.json({ data: withMargin });
}

/** Ops records a new or refreshed vendor quote. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  if (!body.product_id || !body.vendor_name || body.cost_price === undefined) {
    return NextResponse.json(
      { error: "product_id, vendor_name and cost_price are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("product_costs")
    .insert({
      product_id: body.product_id,
      vendor_name: body.vendor_name,
      vendor_type: body.vendor_type ?? "third_party",
      cost_price: Number(body.cost_price),
      effective_from: body.effective_from ?? new Date().toISOString(),
      valid_until: body.valid_until || null,
      notes: body.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("product_costs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
