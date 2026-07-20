// Supabase project config.
// These are PUBLIC values (URL + anon key are safe to expose to the browser).
// Hardcoded fallbacks let the app work even if Vercel env vars aren't set,
// while still allowing override via NEXT_PUBLIC_* environment variables.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://mrfgjofrpyhedibybvjc.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZmdqb2ZycHloZWRpYnlidmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDE1NDQsImV4cCI6MjA5OTgxNzU0NH0.QT2-a178DIB2nP4qKQddEnGeHRIUYJE01HtkETRtUdU";
