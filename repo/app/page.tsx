import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [customers, reps, products, contacts] = await Promise.all([
    supabase.from("customers").select("id, hospital_name, state").order("hospital_name"),
    supabase.from("sales_reps").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("products").select("id, name, sku, supplier").order("name"),
    supabase.from("contacts").select("id, customer_id, name, department").order("name"),
  ]);

  const customerRows = customers.data ?? [];
  const productRows = products.data ?? [];

  const options = {
    customers: customerRows,
    reps: reps.data ?? [],
    products: productRows,
    contacts: contacts.data ?? [],
    states: Array.from(
      new Set(customerRows.map((c) => c.state).filter(Boolean))
    ).sort() as string[],
    suppliers: Array.from(
      new Set(productRows.map((p) => p.supplier).filter(Boolean))
    ).sort() as string[],
  };

  return (
    <DashboardShell
      options={options}
      role={(profile?.role as string) ?? "sales_rep"}
      name={(profile?.name as string) ?? "there"}
    />
  );
}
