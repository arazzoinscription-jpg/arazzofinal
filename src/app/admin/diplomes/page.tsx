import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DiplomesAdmin, type DiplomaRow } from "./diplomes-admin";

export const metadata = { title: "Diplômes — Admin Arazzo" };
export const dynamic = "force-dynamic";

export default async function AdminDiplomesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data } = await admin
    .from("diplomas")
    .select("id, status, full_name, phone, wilaya, address, numero, cni_path, created_at, user:users(nom, email), course:courses(titre_fr)")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows: DiplomaRow[] = (data ?? []).map((d: any) => ({
    id: d.id,
    status: d.status ?? "eligible",
    fullName: d.full_name ?? d.user?.nom ?? "—",
    email: d.user?.nom ? (d.user?.email ?? "") : "",
    phone: d.phone ?? null,
    wilaya: d.wilaya ?? null,
    address: d.address ?? null,
    numero: d.numero ?? null,
    hasCni: !!d.cni_path,
    course: d.course?.titre_fr ?? "",
    createdAt: d.created_at,
  }));

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Diplômes</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Générez manuellement un diplôme, suivez la CNI, et exportez la feuille de livraison.
        </p>
      </div>
      <DiplomesAdmin rows={rows} />
    </div>
  );
}
