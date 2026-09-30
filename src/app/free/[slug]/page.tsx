import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import DeliveryLanding from "./delivery-landing";

// DELIVERY PAGE — la page de livraison d'un cours GRATUIT, 24/7 sur Vercel.
// UN SEUL modèle dynamique pour toutes les pages : le contenu (titre, textes,
// couverture, vidéo Bunny/YouTube, PDF, CTA, formulaire) vient d'un INSTANTANÉ
// que Arazzo OS pousse dans Supabase (`delivery_page_snapshots`, migration 088).
// Lecture en ANON : l'instantané est une donnée publique.

export const dynamic = "force-dynamic";
// L'instantané DOIT être relu à chaque visite : sans cela, le cache de données
// de Next (fetch) garde l'ancienne version — une page dépubliée resterait en
// ligne et une modification n'apparaîtrait pas. Vérifié en test : `force-dynamic`
// seul ne suffit pas (la requête de generateMetadata passait par le cache).
export const fetchCache = "force-no-store";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Un slug arabe peut arriver encodé (%D8%AF…) : on le décode sans jamais planter. */
function decoder(slug: string) {
  try { return decodeURIComponent(slug); } catch { return slug; }
}

/** L'instantané BRUT d'une adresse (ouverte, fermée ou déplacée), ou null. */
async function lireBrut(brut: string): Promise<Record<string, any> | null> {
  const slug = decoder(brut);
  const supabase = createPublicClient();
  const { data: row } = await supabase
    .from("delivery_page_snapshots")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();
  return (row?.data ?? null) as Record<string, any> | null;
}

/** La page servie : seulement si elle est ouverte (`active`), avec un code promo encore valable. */
function pageOuverte(data: Record<string, any> | null): Record<string, any> | null {
  if (!data || data.active !== true) return null;
  return { ...data, promo: promoEncoreValable(data.promo) };
}

/**
 * Le code promo n'est montré que s'il est encore valable À CET INSTANT : l'OS
 * met l'instantané à jour toutes les 5 min, mais une date de fin passée entre
 * deux mises à jour (ou un PC éteint) ne doit jamais afficher un code mort.
 */
function promoEncoreValable(promo: any) {
  if (!promo?.code) return null;
  if (promo.remaining === 0) return null;
  if (promo.end_date && Date.parse(promo.end_date) <= Date.now()) return null;
  return promo;
}

/** L'image de partage : la photo de couverture, sinon l'image de la vidéo YouTube. */
function imagePartage(page: Record<string, any>): string | null {
  if (page.cover_image_url) return String(page.cover_image_url);
  const m = String(page.cover_video_url ?? "").match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

// Aperçu du lien quand il est partagé (Facebook, WhatsApp, Instagram…).
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const page = pageOuverte(await lireBrut(slug));
  if (!page) return { title: "Arazzo Formation", robots: { index: false } };
  const title = page.title || "Cours gratuit — Arazzo";
  const description = String(page.welcome_text || page.description || "Un cours offert par Arazzo Formation.").slice(0, 200);
  const image = imagePartage(page);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function Page(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams },
) {
  const { slug } = await params;
  const brut = await lireBrut(slug);

  // L'adresse a CHANGÉ dans Arazzo OS : l'ancien lien (peut-être déjà partagé)
  // mène à la nouvelle adresse, en gardant ses paramètres (utm…).
  const vers = typeof brut?.moved_to === "string" ? brut.moved_to : null;
  if (brut && brut.active !== true && vers && vers !== decoder(slug)) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries((await searchParams) ?? {})) {
      if (typeof v === "string") q.set(k, v);
    }
    const qs = q.toString();
    redirect(`/free/${encodeURIComponent(vers)}${qs ? `?${qs}` : ""}`);
  }

  const page = pageOuverte(brut);

  // Jamais synchronisée, dépubliée ou archivée : message sobre, bilingue.
  if (!page) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center bg-[#f6f3ff] text-[#4A4468]">
        <div>
          <p className="text-lg">Ce cours n’est pas disponible pour le moment.</p>
          <p className="text-sm mt-1" dir="rtl">هذا الدرس غير متاح حاليًا.</p>
          <a href="/offres" className="inline-block mt-4 text-[#5B16F9] font-semibold">Voir nos formations →</a>
        </div>
      </main>
    );
  }

  return <DeliveryLanding data={{ ...page, slug: decoder(slug) }} />;
}
