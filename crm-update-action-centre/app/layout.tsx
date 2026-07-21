import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Arus Inovasi CRM",
  description: "Medical Device Sales Management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const role = (profile?.role as string) ?? "sales_rep";

  // Urgent count for the sidebar badge — the thing that makes the
  // system speak up without anyone opening a report.
  let urgent = 0;
  if (user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_action_items", {
        p_role: role === "sales_rep" ? "sales_rep" : null,
        p_rep_id: null,
      });
      urgent = Number((data as any)?.red ?? 0);
    } catch {
      urgent = 0;
    }
  }

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="min-h-screen">
            <Sidebar
              email={user.email ?? null}
              role={role}
              urgentCount={urgent}
            />
            <main className="ml-60 px-8 py-8">{children}</main>
          </div>
        ) : (
          <main className="flex min-h-screen items-center justify-center bg-arus-purple px-4">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
