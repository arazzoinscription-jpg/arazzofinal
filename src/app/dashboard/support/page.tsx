import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewTicket } from "./new-ticket";

export const metadata = { title: "Support — Arazzo Formation" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ouvert: { label: "Ouvert", cls: "bg-blue-100 text-blue-700" },
  en_cours: { label: "En cours", cls: "bg-yellow-100 text-yellow-700" },
  resolu: { label: "Résolu", cls: "bg-green-100 text-green-700" },
  ferme: { label: "Fermé", cls: "bg-gray-100 text-gray-500" },
};

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("tickets").select("id, sujet, statut, priorite, updated_at")
    .eq("user_id", user.id).order("updated_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-500 mt-1 font-dm">Une question ? Un problème ? Notre équipe vous répond.</p>
        </div>
        <NewTicket />
      </div>

      <div className="space-y-3">
        {!tickets?.length ? (
          <div className="bg-white rounded-2xl p-10 border border-cream-200 text-center text-gray-400">
            <div className="text-5xl mb-3">🎫</div>Aucun ticket. Créez-en un si vous avez besoin d'aide.
          </div>
        ) : tickets.map((t) => (
          <Link key={t.id} href={`/dashboard/support/${t.id}`}
            className="block bg-white rounded-2xl p-4 border border-cream-200 hover:shadow-lg hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-gray-900 font-dm truncate">{t.sujet}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS[t.statut]?.cls}`}>{STATUS[t.statut]?.label}</span>
            </div>
            <p className="text-xs text-gray-400 font-dm mt-1">Mis à jour {new Date(t.updated_at).toLocaleDateString("fr-FR")} · priorité {t.priorite}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
