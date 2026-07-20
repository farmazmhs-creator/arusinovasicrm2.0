import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "quote-docs";

/** List documents for a quote, each with a short-lived signed URL. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quote_documents")
    .select(
      "id, file_path, file_name, file_size, mime_type, uploaded_at, uploaded_by, user_profiles(name)"
    )
    .eq("quotation_id", id)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (data ?? []).map(async (doc: any) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.file_path, 60 * 60);
      return { ...doc, url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ data: withUrls });
}

/** Record metadata after the browser has uploaded the file to storage. */
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
  if (!body.file_path || !body.file_name) {
    return NextResponse.json(
      { error: "file_path and file_name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("quote_documents")
    .insert({
      quotation_id: id,
      file_path: body.file_path,
      file_name: body.file_name,
      file_size: body.file_size ?? null,
      mime_type: body.mime_type ?? null,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** Remove a document (storage object + metadata row). */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId)
    return NextResponse.json({ error: "docId required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: doc } = await supabase
    .from("quote_documents")
    .select("file_path")
    .eq("id", docId)
    .single();

  if (doc?.file_path) {
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
  }

  const { error } = await supabase
    .from("quote_documents")
    .delete()
    .eq("id", docId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
