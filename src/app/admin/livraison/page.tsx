import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LivraisonTable, type DeliveryRow } from "./livraison-table";

export const metadata = { title: "Inscriptions à la livraison — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function LivraisonPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, full_name, phone, email, address, wilaya, status, total, created_at, order_items(title)")
    .eq("payment_method", "cod")
    .order("created_at", { ascending: false });

  const rows: DeliveryRow[] = (orders ?? []).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number ?? "",
    fullName: o.full_name ?? "",
    phone: o.phone ?? "",
    email: o.email ?? "",
    address: o.address ?? "",
    wilaya: o.wilaya ?? "",
    status: o.status ?? "pending",
    total: Number(o.total) || 0,
    createdAt: o.created_at,
    course: ((o.order_items as any[]) ?? [])[0]?.title ?? "",
  }));

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center"><Truck size={22} /></span>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Inscriptions — paiement à la livraison</h1>
          <p className="text-gray-500 font-dm text-sm">شركة التوصيل · confirmez le paiement, envoyez l'accès, imprimez les fiches.</p>
        </div>
      </div>
      <LivraisonTable rows={rows} />
    </div>
  );
}
