import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Tickets — Arazzo Formation" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ouvert: { label: "Ouvert", cls: "bg-blue-100 text-blue-700" },
  en_cours: { label: "En cours", cls: "bg-yellow-100 text-yellow-700" },
  resolu: { label: "Résolu", cls: "bg-green-100 text-green-700" },
  ferme: { label: "Fermé", cls: "bg-gray-100 text-gray-500" },
};

export default async function StaffTicketsPage() {
  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("tickets")
    .select("id, sujet, statut, priorite, updated_at, user:users(nom, email)")
    .order("updated_at", { ascending: false }).limit(100);

  const counts: Record<string, number> = { ouvert: 0, en_cours: 0, resolu: 0, ferme: 0 };
  (tickets ?? []).forEach((t) => { counts[t.statut] = (counts[t.statut] ?? 0) + 1; });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Tickets support</h1>
        <p className="text-gray-500 mt-1 font-dm">Gérez les demandes de vos étudiantes.</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl p-4 border border-cream-200 text-center">
            <div className="text-2xl font-bold font-playfair text-orange-600">{counts[k] ?? 0}</div>
            <div className="text-xs text-gray-500 font-dm">{v.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {!tickets?.length ? (
          <p className="text-gray-400 font-dm text-sm">Aucun ticket.</p>
        ) : tickets.map((t) => (
          <Link key={t.id} href={`/formateur/tickets/${t.id}`}
            className="block bg-white rounded-2xl p-4 border border-cream-200 hover:shadow-lg hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-gray-900 font-dm truncate">{t.sujet}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS[t.statut]?.cls}`}>{STATUS[t.statut]?.label}</span>
            </div>
            <p className="text-xs text-gray-400 font-dm mt-1">
              {(t.user as any)?.nom ?? "—"} · priorité {t.priorite} · {new Date(t.updated_at).toLocaleDateString("fr-FR")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
