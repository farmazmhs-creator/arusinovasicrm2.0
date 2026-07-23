import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, hospital_name, name, state, area, created_at, contacts(id, name, department, title, phone, email, is_primary, created_at)"
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // primary contact first, then alphabetical
  const contacts = (data.contacts ?? []).sort((a: any, b: any) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return NextResponse.json({ data: { ...data, contacts } });
}

/** Update the hospital's own fields. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (body.hospital_name !== undefined) {
    patch.hospital_name = body.hospital_name;
    patch.name = body.hospital_name;
  }
  if (body.state !== undefined) patch.state = body.state;
  if (body.area !== undefined) patch.area = body.area;

  const { error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
