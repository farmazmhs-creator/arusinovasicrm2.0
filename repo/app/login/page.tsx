"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // ignore double submits
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Keep the button in its loading state through the redirect + dashboard
    // load — don't reset it, or it looks idle while the page is still loading.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>

      <div className="rounded-2xl bg-white p-7 shadow-xl">
        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Medical Device Sales Management
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              disabled={loading}
              className="input disabled:bg-slate-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@arusinovasi.my"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              disabled={loading}
              className="input disabled:bg-slate-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2
                  style={{ width: 16, height: 16 }}
                  className="animate-spin"
                />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>

          {loading && (
            <p className="text-center text-xs text-slate-400">
              Loading your workspace — this can take a few seconds.
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-arus-purple">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
