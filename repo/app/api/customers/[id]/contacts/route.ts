import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Add a contact (department person) to a hospital. */
export async function POST(
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
  if (!(body.name || "").trim())
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });

  // If marking primary, clear any existing primary first.
  if (body.is_primary) {
    await supabase
      .from("contacts")
      .update({ is_primary: false })
      .eq("customer_id", id);
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      customer_id: id,
      name: body.name.trim(),
      department: body.department || null,
      title: body.title || null,
      phone: body.phone || null,
      email: body.email || null,
      is_primary: Boolean(body.is_primary),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** Set a contact primary, or remove one. Uses ?contactId= and ?action= */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId)
    return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await supabase.from("contacts").update({ is_primary: false }).eq("customer_id", id);
  const { error } = await supabase
    .from("contacts")
    .update({ is_primary: true })
    .eq("id", contactId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId)
    return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
