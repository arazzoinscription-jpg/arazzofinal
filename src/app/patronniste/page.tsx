import Link from "next/link";
import { Shapes, ShoppingBag, Ruler, PlusCircle, ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Espace Patronniste — Arazzo" };
export const dynamic = "force-dynamic";

const card = "rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5";

export default async function PatronnisteHome() {
  const admin = createAdminClient();
  const [{ count: patrons }, { count: achats }, { count: surMesure }] = await Promise.all([
    admin.from("patrons").select("*", { count: "exact", head: true }),
    admin.from("patron_purchases").select("*", { count: "exact", head: true }),
    admin.from("patron_custom_orders").select("*", { count: "exact", head: true }).eq("statut", "en_attente"),
  ]);

  const stats = [
    { label: "Patrons au catalogue", value: patrons ?? 0, icon: Shapes, href: "/patronniste/patrons", color: "violet" },
    { label: "Achats clients", value: achats ?? 0, icon: ShoppingBag, href: "/patronniste/commandes", color: "orange" },
    { label: "Sur mesure en attente", value: surMesure ?? 0, icon: Ruler, href: "/patronniste/sur-mesure", color: "violet" },
  ];

  return (
    <div className="text-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold">Espace Patronniste</h1>
          <p className="text-gray-500 dark:text-white/50 mt-1">Gérez vos patrons, fichiers et commandes.</p>
        </div>
        <Link href="/patronniste/patrons/nouveau" className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <PlusCircle size={18} /> Nouveau patron
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className={`${card} hover:shadow-lg transition-shadow group`}>
              <div className="flex items-start justify-between">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color === "orange" ? "bg-orange-500/15 text-orange-500" : "bg-violet-500/15 text-violet-600 dark:text-violet-300"}`}>
                  <Icon size={22} />
                </span>
                <ArrowRight size={18} className="text-gray-300 dark:text-white/30 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-4 text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-gray-500 dark:text-white/50">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <div className={`${card} mt-6`}>
        <h2 className="font-semibold mb-3">Vos droits</h2>
        <ul className="text-sm text-gray-600 dark:text-white/60 space-y-1.5 list-disc ps-5">
          <li>Voir, créer et modifier tous les patrons et leurs fichiers.</li>
          <li>Téléverser des visuels et des fichiers PDF téléchargeables.</li>
          <li>Définir les attributs : tailles, tissus, table des mesures et placement.</li>
          <li>Consulter toutes les commandes des clients.</li>
          <li>Traiter les commandes de patrons sur mesure.</li>
        </ul>
      </div>
    </div>
  );
}
