import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Bulk-assign quote requests to an Ops person (Processed By). Back-office only. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "ops" && prof?.role !== "director")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const processedBy: string | null = body.processed_by || null;
  if (!ids.length)
    return NextResponse.json({ error: "No quotes selected" }, { status: 400 });

  const { error } = await supabase
    .from("quotations")
    .update({ processed_by: processedBy })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: ids.length });
}
