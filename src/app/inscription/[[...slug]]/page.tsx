import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { feedWelcomeSlug } from "@/lib/feed-welcome";
import { FormulaireInscription } from "./formulaire";

/**
 * LE LIEN D'INSCRIPTION GRATUITE à partager (réseaux, réponse automatique SuperProfile) :
 *   /inscription            → le cours gratuit de la Delivery Page du feed (réglée dans l'OS) ;
 *   /inscription/<adresse>  → le cours gratuit d'une Delivery Page précise (/free/<adresse>).
 * Le formulaire crée un compte « visiteuse » (sans formation), connecte la personne, lui envoie ses accès
 * par e-mail et lui ouvre le cours gratuit.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Inscription gratuite — Arazzo Formation",
  description: "Créez votre compte Arazzo gratuitement : votre cours de couture offert, votre espace et l'application.",
};

const decoder = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export default async function PageInscription({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.[0] ? decoder(params.slug[0]) : await feedWelcomeSlug();
  const [{ data: row }, { data: { user } }] = await Promise.all([
    createPublicClient().from("delivery_page_snapshots").select("data").eq("slug", slug).maybeSingle(),
    (await createClient()).auth.getUser(),
  ]);
  const page = (row?.data ?? null) as Record<string, unknown> | null;
  const ouverte = Boolean(page && page.active === true);
  return (
    <FormulaireInscription
      slug={ouverte ? slug : null}
      coursTitre={ouverte ? ((page!.title as string | null) ?? null) : null}
      coursHref={ouverte ? `/free/${encodeURIComponent(slug)}?acces=1` : null}
      dejaConnectee={Boolean(user)}
    />
  );
}
