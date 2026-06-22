import { redirect } from "next/navigation";
import { ScrollText, LogOut, CheckCircle2, ShoppingBag, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/atelier/StatCard";

export const metadata = { title: "Administration — Arazzo Formation" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [
    { count: usersCount },
    { count: coursesCount },
    { count: enrollmentsCount },
    { data: recentEnrollments },
    { data: pendingFormateurs },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase
      .from("enrollments")
      .select("amount, currency, paid_at, user:users(nom, email), course:courses(titre_fr)")
      .order("paid_at", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("id, nom, email, created_at")
      .eq("role", "eleve")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // ── Statistiques e-commerce ──
  const { data: paidOrders } = await supabase
    .from("orders").select("total, status")
    .in("status", ["confirmed", "shipped", "delivered"]);
  const ca = (paidOrders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const { count: ordersCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const { count: pendingProofs } = await supabase
    .from("payment_proofs").select("*", { count: "exact", head: true }).eq("status", "pending");

  async function promoteToFormateur(userId: string) {
    "use server";
    const s = await createClient();
    await s.from("users").update({ role: "formateur" }).eq("id", userId);
  }

  return (
    <div className="px-4 lg:px-8 pb-10 pt-2 space-y-6">
      {/* Titre + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1a1a1a] dark:text-white">Tableau de bord</h1>
          <p className="text-gray-500 dark:text-white/50 mt-1">Pilotez la plateforme, les ventes et la communauté.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/activite"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <ScrollText size={16} /> Journal
          </a>
          <form action="/api/auth/signout" method="POST">
            <button type="submit"
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-500 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <LogOut size={16} /> Déconnexion
            </button>
          </form>
        </div>
      </div>

      {/* KPI principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Utilisateurs" value={usersCount ?? 0} trend="membres inscrits" highlighted />
        <StatCard title="Cours" value={coursesCount ?? 0} trend="au catalogue" />
        <StatCard title="Inscriptions" value={enrollmentsCount ?? 0} trend="aux formations" />
        <StatCard title="Chiffre d'affaires" value={`${ca.toLocaleString("fr-DZ")} DA`} trend="commandes payées" />
      </div>

      {/* KPI e-commerce */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Commandes" value={ordersCount ?? 0} trend="au total" />
        <StatCard title="Preuves en attente" value={pendingProofs ?? 0} trend="à vérifier" />
        <StatCard title="Inscriptions" value={enrollmentsCount ?? 0} trend="actives" />
      </div>

      {/* Accès rapides */}
      <div className="flex flex-wrap gap-2.5">
        <a href="/admin/preuves" className="inline-flex items-center gap-1.5 bg-[#6B21C8] hover:bg-[#5a1aad] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <CheckCircle2 size={16} /> Vérifier les preuves{pendingProofs ? ` (${pendingProofs})` : ""}
        </a>
        <a href="/admin/commandes" className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <ShoppingBag size={16} /> Commandes
        </a>
        <a href="/admin/produits" className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Package size={16} /> Produits
        </a>
      </div>

      {/* Listes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventes récentes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-[#1a1a1a]">Ventes récentes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentEnrollments ?? []).map((e: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.user?.nom}</p>
                  <p className="text-xs text-gray-400 truncate">{e.course?.titre_fr}</p>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="text-sm font-bold text-[#6B21C8]">
                    {e.currency === "DZD" ? `${Number(e.amount).toLocaleString()} DA` : `${Number(e.amount).toFixed(0)} €`}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(e.paid_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            ))}
            {(recentEnrollments ?? []).length === 0 && <p className="px-5 py-6 text-sm text-gray-400">Aucune vente récente.</p>}
          </div>
        </div>

        {/* Utilisateurs récents */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-[#1a1a1a]">Utilisateurs récents</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(pendingFormateurs ?? []).map((u: any) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.nom}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <form action={async () => { "use server"; await promoteToFormateur(u.id); }}>
                  <button type="submit"
                    className="text-xs text-[#6B21C8] font-semibold border border-[#6B21C8]/30 px-3 py-1 rounded-lg hover:bg-[#6B21C8]/5 transition-colors whitespace-nowrap">
                    → Formateur
                  </button>
                </form>
              </div>
            ))}
            {(pendingFormateurs ?? []).length === 0 && <p className="px-5 py-6 text-sm text-gray-400">Aucun utilisateur récent.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
