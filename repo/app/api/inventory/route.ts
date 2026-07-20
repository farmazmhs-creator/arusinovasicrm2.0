import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [{ data: products }, { data: stock }, { data: flags }] =
    await Promise.all([
      supabase.from("products").select("id, sku, name, supplier, unit_price").order("name"),
      supabase.from("inventory").select("product_id, qty_on_hand, reorder_point, updated_at"),
      supabase
        .from("inventory_flags")
        .select("id, product_id, quotation_id, flag_type, qty_required, qty_short, message, created_at")
        .eq("dismissed", false)
        .order("created_at", { ascending: false }),
    ]);

  const stockBy = new Map((stock ?? []).map((s) => [s.product_id, s]));
  const flagsBy = new Map<string, any[]>();
  (flags ?? []).forEach((f) => {
    const list = flagsBy.get(f.product_id) ?? [];
    list.push(f);
    flagsBy.set(f.product_id, list);
  });

  const rows = (products ?? []).map((p) => {
    const s = stockBy.get(p.id);
    const f = flagsBy.get(p.id) ?? [];
    const onHand = s?.qty_on_hand ?? 0;
    const reserved = f
      .filter((x) => x.flag_type === "potential_outbound")
      .reduce((sum, x) => sum + Number(x.qty_required), 0);
    return {
      ...p,
      qty_on_hand: onHand,
      reorder_point: s?.reorder_point ?? 0,
      reserved,
      available: onHand - reserved,
      flags: f,
      needs_refresh: f.some((x) => x.flag_type === "stock_refresh_required"),
      low_stock: onHand > 0 && onHand <= (s?.reorder_point ?? 0),
      out_of_stock: onHand === 0,
    };
  });

  return NextResponse.json({ data: rows });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  if (!body.product_id)
    return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.qty_on_hand !== undefined)
    patch.qty_on_hand = Number(body.qty_on_hand);
  if (body.reorder_point !== undefined)
    patch.reorder_point = Number(body.reorder_point);

  const { error } = await supabase
    .from("inventory")
    .update(patch)
    .eq("product_id", body.product_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
