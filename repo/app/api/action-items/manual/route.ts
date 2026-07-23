import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Ad-hoc follow-ups the team adds themselves. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  if (!body.title)
    return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("follow_ups_manual")
    .insert({
      title: body.title,
      detail: body.detail || null,
      owner_role: body.owner_role || "ops",
      due_date: body.due_date || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** Mark an ad-hoc follow-up done. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("follow_ups_manual")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
