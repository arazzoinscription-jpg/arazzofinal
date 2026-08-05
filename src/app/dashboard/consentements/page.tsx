import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashHeader, ATELIER_CARD } from "../dash-header";

export const metadata = { title: "Autorisations de publication — Arazzo Formation" };
export const dynamic = "force-dynamic";

/**
 * Qui a autorisé la publication de ses travaux, qui l'a refusée, qui n'a pas
 * encore répondu.
 *
 * Deux partis pris.
 *
 * Les REFUS sont affichés aussi visiblement que les accords. Une page qui ne
 * montrerait que les « oui » donnerait l'impression d'un stock disponible et
 * ferait oublier que ces personnes ont dit non — ce qui est précisément
 * l'information à ne pas perdre.
 *
 * Les élèves SANS PSEUDO sont signalées à part. Leur accord existe mais reste
 * sans effet : rien ne peut les désigner. Les compter parmi les autorisations
 * utilisables serait un chiffre juste et trompeur.
 */
export default async function ConsentementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: moi } = await supabase
    .from("users").select("role").eq("id", user.id).single();

  // Garde côté serveur : la politique RLS protège déjà les données, mais une
  // page qui s'affiche puis se vide est une mauvaise réponse à « vous n'avez
  // pas le droit ».
  if (!["admin", "formateur"].includes(moi?.role ?? "")) redirect("/dashboard");

  const [{ data: decisions }, { data: eleves }] = await Promise.all([
    supabase
      .from("publication_consent_status")
      .select("user_id, granted, decided_at")
      .order("decided_at", { ascending: false }),
    supabase.from("users").select("id, username").eq("role", "eleve"),
  ]);

  const parId = new Map((eleves ?? []).map((e) => [e.id, e.username as string | null]));
  const lignes = (decisions ?? []).map((d) => ({
    ...d,
    username: parId.get(d.user_id) ?? null,
  }));

  const accords = lignes.filter((l) => l.granted);
  const refus = lignes.filter((l) => !l.granted);
  const utilisables = accords.filter((l) => l.username?.trim());
  const sansPseudo = accords.length - utilisables.length;
  const enAttente = (eleves?.length ?? 0) - lignes.length;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl">
      <DashHeader index="10" eyebrow="Vie privée" title="Autorisations de publication"
        subtitle="Qui accepte que ses travaux paraissent sur les réseaux, et qui refuse." />

      {/* Les quatre chiffres, dont celui qui compte vraiment : « utilisables ». */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { n: utilisables.length, l: "utilisables", c: "text-green-600" },
          { n: sansPseudo, l: "accords sans pseudo", c: "text-orange-600" },
          { n: refus.length, l: "refus", c: "text-gray-500" },
          { n: enAttente, l: "sans réponse", c: "text-gray-400" },
        ].map((k) => (
          <div key={k.l} className={`rounded-2xl p-4 ${ATELIER_CARD}`}>
            <div className={`text-2xl font-bold ${k.c}`}>{k.n}</div>
            <div className="text-xs text-gray-500 font-dm mt-1">{k.l}</div>
          </div>
        ))}
      </div>

      {sansPseudo > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 mb-8">
          <p className="text-sm text-gray-800 font-dm leading-relaxed">
            <strong>{sansPseudo}</strong>{" "}
            {sansPseudo > 1 ? "élèves ont accepté" : "élève a accepté"} mais
            n&apos;{sansPseudo > 1 ? "ont" : "a"} pas encore choisi de pseudo.
            Leur accord est enregistré, mais rien ne peut être publié :
            aucune Story ne saurait comment les désigner. La fenêtre le leur
            propose à chaque connexion.
          </p>
        </div>
      )}

      <div className={`rounded-2xl p-6 ${ATELIER_CARD}`}>
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-4">
          Décisions ({lignes.length})
        </h2>

        {lignes.length === 0 ? (
          <p className="text-gray-400 text-sm font-dm">
            Personne n&apos;a encore répondu. La fenêtre s&apos;affiche à chaque
            connexion tant qu&apos;une élève n&apos;a pas décidé.
          </p>
        ) : (
          <div className="space-y-1">
            {lignes.map((l) => (
              <div key={l.user_id}
                className="flex items-center gap-3 py-2.5 border-b border-cream-100 last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  l.granted ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="text-sm font-dm text-gray-800 dark:text-gray-100 flex-1 truncate">
                  {l.username?.trim() ? `@${l.username}` : (
                    <span className="text-orange-600">sans pseudo</span>
                  )}
                </span>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  l.granted ? "text-green-600" : "text-gray-500"}`}>
                  {l.granted ? "a accepté" : "a refusé"}
                </span>
                <span className="text-xs text-gray-400 font-dm flex-shrink-0 hidden sm:inline">
                  {date(l.decided_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 font-dm mt-6 leading-relaxed">
        Un accord peut être retiré à tout moment par l&apos;élève, depuis son
        profil. Cette page montre la décision la plus récente de chacune ;
        l&apos;historique complet est conservé en base et n&apos;est jamais
        écrasé. <Link href="/dashboard/profil" className="underline">Relire le
        texte affiché aux élèves</Link>.
      </p>
    </div>
  );
}
