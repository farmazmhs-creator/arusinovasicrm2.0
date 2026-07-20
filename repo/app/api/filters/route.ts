import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [customers, reps, products] = await Promise.all([
    supabase.from("customers").select("id, hospital_name, state").order("hospital_name"),
    supabase.from("sales_reps").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("products").select("id, name, sku, supplier").order("name"),
  ]);

  const states = Array.from(
    new Set((customers.data ?? []).map((c) => c.state).filter(Boolean))
  ).sort();
  const suppliers = Array.from(
    new Set((products.data ?? []).map((p) => p.supplier).filter(Boolean))
  ).sort();

  return NextResponse.json({
    customers: customers.data ?? [],
    reps: reps.data ?? [],
    products: products.data ?? [],
    states,
    suppliers,
  });
}
