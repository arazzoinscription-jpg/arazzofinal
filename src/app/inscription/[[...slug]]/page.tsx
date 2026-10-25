import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { FormulaireInscription } from "./formulaire";

/**
 * LE LIEN D'INSCRIPTION GRATUITE à partager (réseaux, réponse automatique SuperProfile) :
 *   /inscription            → le compte SEUL : aucun cours gratuit n'est donné d'office (un cadeau se gagne par sa page) ;
 *   /inscription/<adresse>  → le compte + le cours gratuit de CETTE Delivery Page (/free/<adresse>) : c'est son lien.
 * Le formulaire crée un compte « visiteuse » (sans formation), connecte la personne, lui envoie ses accès
 * par e-mail et, avec une adresse de page, lui ouvre le cours gratuit.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Inscription gratuite — Arazzo Formation",
  description: "Créez votre compte Arazzo gratuitement : votre cours de couture offert, votre espace et l'application.",
};

const decoder = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export default async function PageInscription({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.[0] ? decoder(params.slug[0]) : null;
  const [row, { data: { user } }] = await Promise.all([
    slug ? createPublicClient().from("delivery_page_snapshots").select("data").eq("slug", slug).maybeSingle().then((r) => r.data) : Promise.resolve(null),
    (await createClient()).auth.getUser(),
  ]);
  const page = (row?.data ?? null) as Record<string, unknown> | null;
  const ouverte = Boolean(slug && page && page.active === true);
  return (
    <FormulaireInscription
      slug={ouverte ? slug : null}
      coursTitre={ouverte ? ((page!.title as string | null) ?? null) : null}
      coursHref={ouverte ? `/free/${encodeURIComponent(slug!)}?acces=1` : null}
      dejaConnectee={Boolean(user)}
    />
  );
}
