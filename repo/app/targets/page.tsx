import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import TargetsClient from "@/components/TargetsClient";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const profile = await getCurrentProfile();
  // Director-only. Anyone else is bounced to the dashboard.
  if (profile?.role !== "director") redirect("/");
  return <TargetsClient />;
}
