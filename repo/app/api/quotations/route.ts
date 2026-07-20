import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(
      "id, quote_number, status, total_amount, received_at, completed_at, customers(name, hospital_name), sales_reps(name, code)"
    )
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

type IncomingItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: {
    customer_id?: string;
    sales_rep_id?: string;
    discount_pct?: number;
    received_at?: string;
    external_ref?: string | null;
    source?: string;
    items?: IncomingItem[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.customer_id || !body.sales_rep_id) {
    return NextResponse.json(
      { error: "customer_id and sales_rep_id are required" },
      { status: 400 }
    );
  }

  const items = (body.items ?? []).filter(
    (it) => it.product_id && it.quantity > 0
  );
  const discount = Number(body.discount_pct ?? 0);
  const subtotal = items.reduce(
    (s, it) => s + Number(it.quantity) * Number(it.unit_price),
    0
  );
  const total = Math.round(subtotal * (1 - discount / 100) * 100) / 100;

  const { count } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true });
  const quoteNumber = `QT-2026-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: quote, error: quoteErr } = await supabase
    .from("quotations")
    .insert({
      quote_number: quoteNumber,
      customer_id: body.customer_id,
      sales_rep_id: body.sales_rep_id,
      status: "received",
      discount_pct: discount,
      total_amount: total,
      received_at: body.received_at ?? new Date().toISOString(),
      external_ref: body.external_ref ?? null,
      source: body.source ?? "manual",
    })
    .select("id")
    .single();

  if (quoteErr || !quote) {
    return NextResponse.json(
      { error: quoteErr?.message ?? "Failed to save request" },
      { status: 500 }
    );
  }

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from("quotation_items").insert(
      items.map((it) => ({
        quotation_id: quote.id,
        product_id: it.product_id,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
      }))
    );
    if (itemsErr)
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: quote.id, quote_number: quoteNumber });
}
