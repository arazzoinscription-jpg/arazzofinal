import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Landing PACK native (24/7, backend Supabase du LMS). Lit course_packs +
// course_pack_items + les cours inclus. Affiche les formations réunies côte à
// côte, le prix normal BARRÉ → prix pack, et l'économie. L'inscription passe par
// la boutique du LMS (/boutique/<slug>) — aucun tunnel, aucune dépendance à OS.

export const dynamic = "force-dynamic";

// Les slugs de pack peuvent être en arabe → encodés dans l'URL. On décode avant
// de comparer en base (comme la page formations/[slug]).
function decodeSlug(s: string) { try { return decodeURIComponent(s); } catch { return s; } }

type Course = { id: string; titre_fr: string | null; prix_dzd: number | null; slug: string | null };
type Pack = {
  id: string; slug: string | null; titre_fr: string | null; titre_ar: string | null;
  description_fr: string | null; prix_dzd: number | null; thumbnail: string | null;
};

async function loadPack(slug: string) {
  const supabase = await createClient();
  const { data: pack } = await supabase
    .from("course_packs")
    .select("id, slug, titre_fr, titre_ar, description_fr, prix_dzd, thumbnail, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!pack) return null;

  const { data: items } = await supabase
    .from("course_pack_items")
    .select("course_id")
    .eq("pack_id", (pack as Pack).id);
  const ids = [...new Set((items ?? []).map((i) => i.course_id).filter(Boolean))];

  let courses: Course[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("courses")
      .select("id, titre_fr, prix_dzd, slug")
      .in("id", ids);
    courses = (data as Course[]) ?? [];
  }

  // Le pack se vend via un produit boutique de type "bundle" dont `files`
  // contient "pack:<id>". Son slug (≠ course_packs.slug) est la page d'achat.
  let buySlug: string | null = null;
  try {
    const { data: bundles } = await supabase
      .from("products")
      .select("slug, files, is_active")
      .eq("type", "bundle")
      .eq("is_active", true);
    const prod = (bundles ?? []).find((p) => ((p.files as string[]) ?? []).includes(`pack:${(pack as Pack).id}`));
    buySlug = (prod as { slug?: string } | undefined)?.slug ?? null;
  } catch { buySlug = null; }

  const cumul = courses.reduce((s, c) => s + (Number(c.prix_dzd) || 0), 0);
  const prix = Number((pack as Pack).prix_dzd) || 0;
  const eco = cumul > prix ? cumul - prix : 0;
  return { pack: pack as Pack, courses, cumul, prix, eco, buySlug };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("course_packs").select("titre_fr").eq("slug", decodeSlug(params.slug)).maybeSingle();
  const nom = (data as { titre_fr?: string } | null)?.titre_fr;
  return { title: `${nom ? `${nom} — ` : ""}Pack — Arazzo Formation` };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const data = await loadPack(decodeSlug(params.slug));
  if (!data) notFound();
  const { pack, courses, cumul, prix, eco, buySlug } = data;
  const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

  return (
    <main className="min-h-screen bg-[#f6f3ff] text-[#1a1230]">
      <header className="bg-gradient-to-br from-[#4a17c9] via-[#2A0880] to-[#22076b] text-white px-6 py-14 border-b-4 border-[#FE7223]">
        <div className="max-w-2xl mx-auto">
          <div className="font-serif font-bold text-xl mb-6">Arazzo <span className="text-[#FE7223] italic">Formation</span></div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🎁 Pack formation</span>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold mt-4 leading-tight">{pack.titre_fr || "Pack"}</h1>
          {pack.description_fr ? <p className="text-white/85 mt-3">{pack.description_fr}</p> : null}
          {prix ? (
            <span className="inline-block mt-4 text-sm font-semibold bg-[#FE7223] rounded-full px-3.5 py-1.5">💳 {fmt(prix)} DA</span>
          ) : null}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        <div className="-mt-10 bg-white border border-[#eee] rounded-3xl shadow-xl p-6 md:p-8">
          <h2 className="font-serif text-xl font-semibold text-[#2A0880] mb-1">🎁 Ce que contient le pack</h2>
          <p className="text-sm text-gray-500 mb-4">Deux formations réunies en un pack</p>

          {/* Formations réunies, côte à côte. */}
          <div className="grid grid-cols-2 gap-3 relative">
            {courses.map((c, i) => (
              <div key={c.id} className="relative flex flex-col items-center text-center gap-1.5 rounded-xl border-2 border-[#e7e1f7] bg-[#faf8ff] px-3 pt-5 pb-4">
                <span className="absolute -top-3 left-3 grid place-items-center w-6 h-6 rounded-full bg-[#5B16F9] text-white text-xs font-extrabold">{i + 1}</span>
                <strong className="text-[#2A0880] leading-tight">{c.titre_fr || "Formation"}</strong>
                {c.prix_dzd != null ? <span className="text-sm text-gray-500 font-mono">{fmt(Number(c.prix_dzd))} DA</span> : null}
                {c.slug ? <Link href={`/boutique/${c.slug}`} className="text-xs font-bold text-[#5B16F9] hover:underline">Voir la formation →</Link> : null}
              </div>
            ))}
          </div>

          {/* L'offre : prix normal barré → prix pack + économie. */}
          <div className="mt-5 rounded-xl border-2 border-[#ffd9bf] bg-[#fff6ee] p-4 text-center">
            {eco > 0 ? (
              <div className="flex items-baseline justify-center gap-2.5 flex-wrap">
                <span className="text-sm text-gray-400">Valeur totale</span>
                <span className="line-through text-gray-400 font-semibold">{fmt(cumul)} DA</span>
                <span className="text-[#FE7223] font-extrabold">→</span>
                <span className="font-serif text-2xl font-bold text-[#FE7223] leading-none">{fmt(prix)} DA</span>
              </div>
            ) : (
              <div className="font-serif text-2xl font-bold text-[#FE7223]">{fmt(prix)} DA</div>
            )}
            {eco > 0 ? (
              <div className="mt-2.5 inline-block rounded-full bg-[#128a4c]/10 border border-[#128a4c]/30 text-[#128a4c] font-extrabold text-sm px-3 py-1.5">🎁 Vous économisez {fmt(eco)} DA</div>
            ) : null}
          </div>

          {/* CTA : achat/inscription via la boutique du LMS (24/7). Le pack doit
              être « mis en vente » (produit bundle) ; sinon on invite à contacter. */}
          {buySlug ? (
            <Link href={`/boutique/${buySlug}`}
              className="block text-center mt-6 bg-gradient-to-br from-[#FE7223] to-[#f2520a] text-white font-bold px-6 py-4 rounded-xl hover:brightness-105 transition">
              Je m’inscris à ce pack →
            </Link>
          ) : (
            <Link href="/contact"
              className="block text-center mt-6 bg-gradient-to-br from-[#FE7223] to-[#f2520a] text-white font-bold px-6 py-4 rounded-xl hover:brightness-105 transition">
              Je veux ce pack — nous contacter →
            </Link>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">Arazzo · École de couture</p>
        </div>
      </div>
    </main>
  );
}
