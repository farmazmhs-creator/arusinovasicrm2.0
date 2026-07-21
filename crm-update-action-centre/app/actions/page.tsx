import { getCurrentProfile } from "@/lib/auth";
import ActionCentre from "@/components/ActionCentre";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const profile = await getCurrentProfile();
  const full = ((profile?.name as string) ?? "there").split(" ")[0];
  return <ActionCentre name={full} />;
}
