import { createClient } from "@/lib/supabase/server";
import { CustomOrderForm } from "./order-form";
import { CustomOrderCard } from "./order-card";

export const metadata = { title: "Commande sur mesure — Arazzo" };
export const dynamic = "force-dynamic";

export default async function SurMesurePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orders } = await supabase
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, statut, proposed_price_dzd, created_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Patron sur mesure</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Commandez un patron réalisé d'après vos propres mesures.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomOrderForm />

        <div>
          <h2 className="font-semibold mb-3">Mes demandes</h2>
          {!orders?.length ? (
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-8 text-center text-gray-400 text-sm">
              Vous n'avez pas encore de commande sur mesure.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <CustomOrderCard key={o.id} o={o as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
