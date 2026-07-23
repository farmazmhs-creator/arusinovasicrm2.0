"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Building2,
  Boxes,
  BookOpen,
  LogOut,
} from "lucide-react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/actions", label: "Action Centre", icon: Bell, badge: true },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/pricebook", label: "Pricebook", icon: BookOpen },
];

export default function Sidebar({
  email,
  role,
  urgentCount = 0,
}: {
  email: string | null;
  role: string;
  urgentCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-arus-purple">
      <div className="px-5 py-6">
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-arus-amber text-arus-purple"
                  : "text-purple-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon style={{ width: 18, height: 18 }} />
              <span className="flex-1">{l.label}</span>
              {l.badge && urgentCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? "bg-arus-purple text-white" : "bg-rose-500 text-white"
                  }`}
                >
                  {urgentCount > 99 ? "99+" : urgentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-xs text-purple-100/70">{email}</p>
        <p className="mb-3 text-[11px] uppercase tracking-wide text-arus-amber">
          {role.replace("_", " ")}
        </p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-purple-100/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign out
        </button>
      </div>
    </aside>
  );
}
