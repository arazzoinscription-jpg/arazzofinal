import { Ruler, AlertTriangle, BadgeCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusSelect } from "./status-select";
import { ClaimButton } from "./claim-button";

export const metadata = { title: "Commandes sur mesure — Patronniste" };
export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  en_attente: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  en_cours: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  termine: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  annule: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50",
};
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function SurMesurePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, note, statut, created_at, photo_url, video_url, patronniste_id, claimed_at, client:users!patron_custom_orders_client_id_fkey(nom, email), responsable:users!patron_custom_orders_patronniste_id_fkey(nom)")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = orders ?? [];
  const alerts = list.filter((o) => !o.patronniste_id && o.statut === "en_attente");
  const mine = list.filter((o) => o.patronniste_id === user?.id);
  const others = list.filter((o) => o.patronniste_id && o.patronniste_id !== user?.id);

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Commandes sur mesure</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">
        {alerts.length} en attente · {mine.length} à vous · {others.length} prises par d'autres.
      </p>

      {/* ── Alertes : commandes à prendre ─────────────────────────── */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-300 mb-3">
          <AlertTriangle size={18} /> Alertes commandes — à prendre
        </h2>
        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-8 text-center text-gray-400">
            <Ruler size={28} className="mx-auto mb-2 opacity-40" /> Aucune commande en attente.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {alerts.map((o) => {
              const urgent = Date.now() - new Date(o.created_at).getTime() > DAY_MS;
              return <OrderCard key={o.id} o={o} variant="alert" urgent={urgent} />;
            })}
          </div>
        )}
      </section>

      {/* ── Mes commandes ─────────────────────────────────────────── */}
      {mine.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 font-semibold text-violet-700 dark:text-violet-300 mb-3">
            <BadgeCheck size={18} /> Mes commandes en charge
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {mine.map((o) => <OrderCard key={o.id} o={o} variant="mine" />)}
          </div>
        </section>
      )}

      {/* ── Prises par d'autres ───────────────────────────────────── */}
      {others.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-semibold text-gray-500 dark:text-white/50 mb-3">
            <Clock size={18} /> Prises par d'autres patronnistes
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {others.map((o) => <OrderCard key={o.id} o={o} variant="other" />)}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderCard({ o, variant, urgent }: { o: any; variant: "alert" | "mine" | "other"; urgent?: boolean }) {
  const client = o.client as { nom?: string; email?: string } | null;
  const responsable = o.responsable as { nom?: string } | null;
  const mesures = (o.mesures ?? {}) as Record<string, string | number>;
  const entries = Object.entries(mesures);
  return (
    <div className={`rounded-2xl bg-white dark:bg-white/[0.04] border p-5 ${urgent ? "border-red-300 dark:border-red-500/40 ring-1 ring-red-200" : "border-cream-200 dark:border-white/10"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{o.titre}</h3>
          <p className="text-xs text-gray-400">{client?.nom ?? "—"} · {client?.email}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUT_BADGE[o.statut] ?? ""}`}>
          {o.statut.replace("_", " ")}
        </span>
      </div>

      {urgent && variant === "alert" && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={12} /> 2ᵉ alerte · en attente depuis +24 h
        </div>
      )}

      {/* Médias du modèle */}
      {(o.photo_url || o.video_url) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {o.photo_url && <img src={o.photo_url} alt="Modèle" className="w-full h-32 object-cover rounded-lg border border-cream-200 dark:border-white/10" />}
          {o.video_url && (
            /mediadelivery\.net|\/embed\//.test(o.video_url)
              ? <iframe src={o.video_url} className="w-full h-32 rounded-lg bg-black" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowFullScreen title="Vidéo du modèle" />
              : <video src={o.video_url} controls className="w-full h-32 object-cover rounded-lg bg-black" />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
        {o.taille && <span className="bg-cream-100 dark:bg-white/10 px-2 py-0.5 rounded">Taille : {o.taille}</span>}
        {o.tissu && <span className="bg-cream-100 dark:bg-white/10 px-2 py-0.5 rounded">Tissu : {o.tissu}</span>}
      </div>

      {entries.length > 0 && (
        <div className="rounded-xl border border-cream-200 dark:border-white/10 overflow-hidden mb-3">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-cream-100 dark:divide-white/5">
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-white/50">{k}</td>
                  <td className="px-3 py-1.5 text-end font-medium">{String(v)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {o.note && <p className="text-sm text-gray-500 dark:text-white/50 mb-3 italic">« {o.note} »</p>}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
        {variant === "alert" ? (
          <div className="flex-1 max-w-[12rem]"><ClaimButton id={o.id} /></div>
        ) : variant === "mine" ? (
          <StatusSelect id={o.id} current={o.statut} />
        ) : (
          <span className="text-xs font-medium text-violet-600 dark:text-violet-300">Prise par {responsable?.nom ?? "une patronniste"}</span>
        )}
      </div>
    </div>
  );
}
