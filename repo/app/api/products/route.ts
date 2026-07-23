import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** Add a new product, its opening stock and optionally a first vendor cost. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }

  // Auto-generate the SKU if none supplied — non-technical users shouldn't
  // have to invent one. Next in the AI-#### sequence.
  let sku = (body.sku || "").trim();
  if (!sku) {
    const { data: last } = await supabase
      .from("products")
      .select("sku")
      .ilike("sku", "AI-%")
      .order("sku", { ascending: false })
      .limit(1)
      .maybeSingle();
    const n = last?.sku ? parseInt(last.sku.replace(/\D/g, ""), 10) || 0 : 0;
    sku = `AI-${String(n + 1).padStart(4, "0")}`;
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      sku,
      name: body.name,
      supplier: body.supplier || null,
      unit_price: Number(body.unit_price ?? 0),
    })
    .select("id, sku")
    .single();

  if (error || !product)
    return NextResponse.json(
      { error: error?.message ?? "Failed to create product" },
      { status: 500 }
    );

  // Opening stock
  const { error: invErr } = await supabase.from("inventory").insert({
    product_id: product.id,
    qty_on_hand: Number(body.qty_on_hand ?? 0),
    reorder_point: Number(body.reorder_point ?? 10),
  });
  if (invErr)
    return NextResponse.json({ error: invErr.message }, { status: 500 });

  // Optional opening vendor cost
  if (body.cost_price) {
    await supabase.from("product_costs").insert({
      product_id: product.id,
      vendor_name: body.vendor_name || body.supplier || "Unknown vendor",
      vendor_type: body.vendor_type ?? "manufacturer",
      cost_price: Number(body.cost_price),
      created_by: user.id,
      notes: "Opening cost",
    });
  }

  return NextResponse.json({ id: product.id, sku: product.sku });
}
