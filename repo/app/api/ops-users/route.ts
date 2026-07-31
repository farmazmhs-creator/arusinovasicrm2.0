import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Ops (and director) users a request can be assigned to. Back-office only. */
export async function GET() {
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

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, name, role")
    .in("role", ["ops", "director"])
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
