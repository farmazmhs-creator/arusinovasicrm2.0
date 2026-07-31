import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "quote-docs";

async function guard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 401 as const };
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "ops" && prof?.role !== "director")
    return { supabase, user, error: 403 as const };
  return { supabase, user, error: null };
}

/** Vendor cost entries, newest first, with the product they price. Back-office only. */
export async function GET(request: Request) {
  const { supabase, error } = await guard();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  const { data, error: qErr } = await supabase
    .from("product_costs")
    .select(
      "id, product_id, vendor_name, vendor_type, cost_price, currency, effective_from, valid_until, notes, ex_stock, est_delivery_on_payment, terms, moq, vendor_quote_path, vendor_quote_name, created_at, products(name, sku, unit_price, supplier)"
    )
    .order("effective_from", { ascending: false })
    .limit(500);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

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

  const withMargin = await Promise.all(
    rows.map(async (r) => {
      const sell = Number(r.products?.unit_price ?? 0);
      const cost = Number(r.cost_price);
      let quote_url: string | null = null;
      if (r.vendor_quote_path) {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(r.vendor_quote_path, 60 * 60);
        quote_url = signed?.signedUrl ?? null;
      }
      return {
        ...r,
        sell_price: sell,
        margin: sell - cost,
        margin_pct: sell > 0 ? ((sell - cost) / sell) * 100 : null,
        active:
          new Date(r.effective_from) <= new Date() &&
          (!r.valid_until || new Date(r.valid_until) >= new Date()),
        quote_url,
      };
    })
  );

  return NextResponse.json({ data: withMargin });
}

/** Ops records a new or refreshed vendor quote. Supersedes prior active quotes
 *  for the same product so only the newest is in force. */
export async function POST(request: Request) {
  const { supabase, user, error } = await guard();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const body = await request.json();
  if (!body.product_id || !body.vendor_name || body.cost_price === undefined) {
    return NextResponse.json(
      { error: "product_id, vendor_name and cost_price are required" },
      { status: 400 }
    );
  }

  const effectiveFrom = body.effective_from ?? new Date().toISOString();

  // Supersede: any currently-open quote for this product ends when the new one
  // begins, so the pricebook only ever shows one active cost per product.
  await supabase
    .from("product_costs")
    .update({ valid_until: effectiveFrom })
    .eq("product_id", body.product_id)
    .is("valid_until", null);

  const { data, error: insErr } = await supabase
    .from("product_costs")
    .insert({
      product_id: body.product_id,
      vendor_name: body.vendor_name,
      vendor_type: body.vendor_type ?? "third_party",
      cost_price: Number(body.cost_price),
      effective_from: effectiveFrom,
      valid_until: body.valid_until || null,
      notes: body.notes || null,
      ex_stock: body.ex_stock ?? null,
      est_delivery_on_payment: body.est_delivery_on_payment || null,
      terms: body.terms || null,
      moq: body.moq !== undefined && body.moq !== "" ? Number(body.moq) : null,
      vendor_quote_path: body.vendor_quote_path || null,
      vendor_quote_name: body.vendor_quote_name || null,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(request: Request) {
  const { supabase, error } = await guard();
  if (error)
    return NextResponse.json(
      { error: error === 401 ? "Not authenticated" : "Forbidden" },
      { status: error }
    );

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error: delErr } = await supabase
    .from("product_costs")
    .delete()
    .eq("id", id);
  if (delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
