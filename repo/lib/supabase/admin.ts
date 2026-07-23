import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Server-only Supabase client using the service-role key.
 *
 * The WhatsApp webhook is called by Twilio with no logged-in user, so it can't
 * use the cookie-based client. The service-role key bypasses RLS and must never
 * reach the browser — it's only read here, in server code, from an env var.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
