import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";

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

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="min-h-screen">
            <Sidebar email={user.email ?? null} role={role} />
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
