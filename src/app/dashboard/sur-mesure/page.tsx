import Link from "next/link";
import { Ruler, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomOrderForm } from "./order-form";
import { CustomOrderCard } from "./order-card";
import { orderType } from "./constants";

export const metadata = { title: "Commande sur mesure — Arazzo" };
export const dynamic = "force-dynamic";

const SERVICES = {
  patron: { label: "Patron sur mesure", Icon: Ruler, desc: "Commandez un patron réalisé d'après vos propres mesures.", href: "/dashboard/sur-mesure?type=patron" },
  placement: { label: "Placement sur mesure", Icon: LayoutGrid, desc: "Le calage optimal de vos pièces sur le tissu, d'après votre métrage et vos mesures.", href: "/dashboard/sur-mesure?type=placement" },
} as const;
type ServiceType = keyof typeof SERVICES;

export default async function SurMesurePage({ searchParams }: { searchParams: { type?: string } }) {
  const type: ServiceType = searchParams.type === "placement" ? "placement" : "patron";
  const svc = SERVICES[type];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orders } = await supabase
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, note, statut, proposed_price_dzd, created_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">{svc.label}</h1>
      <p className="text-gray-500 dark:text-white/50 mb-5">{svc.desc}</p>

      {/* Sélecteur de prestation : patron / placement */}
      <div className="inline-flex flex-wrap gap-2 mb-7 p-1 rounded-2xl bg-cream-100 dark:bg-white/[0.05] ring-1 ring-cream-200 dark:ring-white/10">
        {(Object.keys(SERVICES) as ServiceType[]).map((k) => {
          const s = SERVICES[k];
          const on = k === type;
          return (
            <Link key={k} href={s.href} aria-current={on ? "page" : undefined}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                on ? "bg-violet-DEFAULT text-white shadow-md" : "text-gray-600 dark:text-white/70 hover:text-violet-700 dark:hover:text-white"
              }`}>
              <s.Icon size={16} /> {s.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomOrderForm type={type} />

        <div>
          <h2 className="font-semibold mb-3">Mes demandes</h2>
          {!orders?.length ? (
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-8 text-center text-gray-400 text-sm">
              Vous n'avez pas encore de commande sur mesure.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <CustomOrderCard key={o.id} o={o as any} type={orderType(o as any)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
