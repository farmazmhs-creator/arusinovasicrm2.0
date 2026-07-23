import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, hospital_name, name, state, area, created_at, contacts(id, name, department, is_primary)"
    )
    .order("hospital_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((c: any) => {
    const contacts = c.contacts ?? [];
    const primary =
      contacts.find((x: any) => x.is_primary) ?? contacts[0] ?? null;
    return {
      id: c.id,
      hospital_name: c.hospital_name,
      name: c.name,
      state: c.state,
      area: c.area,
      created_at: c.created_at,
      contact_count: contacts.length,
      primary_contact: primary
        ? {
            name: primary.name,
            department: primary.department,
          }
        : null,
    };
  });

  return NextResponse.json({ data: rows });
}

/** Add a new customer (hospital) with an optional first contact. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const hospital = (body.hospital_name || "").trim();
  if (!hospital)
    return NextResponse.json(
      { error: "Hospital name is required." },
      { status: 400 }
    );

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      hospital_name: hospital,
      name: hospital,
      state: body.state || null,
      area: body.area || null,
      contact_person: body.contact?.name || null,
    })
    .select("id")
    .single();

  if (error || !customer)
    return NextResponse.json(
      { error: error?.message ?? "Failed to add customer" },
      { status: 500 }
    );

  // Optional first contact
  const c = body.contact;
  if (c && (c.name || "").trim()) {
    await supabase.from("contacts").insert({
      customer_id: customer.id,
      name: c.name.trim(),
      department: c.department || null,
      title: c.title || null,
      phone: c.phone || null,
      email: c.email || null,
      is_primary: true,
    });
  }

  return NextResponse.json({ id: customer.id });
}
