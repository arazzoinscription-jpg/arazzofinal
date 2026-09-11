import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Hub NATIF (24/7) de toutes les offres. Liste les 3 niveaux → landings natives.
const NIVEAUX = [
  { slug: "niveau-1", id: "23bee490-103a-492d-9253-256178658e02", sous: "Débutante — bases & vêtements du quotidien" },
  { slug: "niveau-2", id: "b100190c-4f95-4f63-bd22-7a561f9666de", sous: "Intermédiaire — classique & tenues de soirée" },
  { slug: "niveau-3", id: "de1da439-6dc9-4cf0-9526-e44af4c5073b", sous: "Avancée — modélisme & pièces complexes" },
];

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, titre_fr, prix_dzd")
    .in("id", NIVEAUX.map((n) => n.id));
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <main className="min-h-screen bg-[#f6f3ff] text-[#1a1230]">
      <header className="bg-gradient-to-br from-[#4a17c9] via-[#2A0880] to-[#22076b] text-white px-6 py-14 border-b-4 border-[#FE7223]">
        <div className="max-w-2xl mx-auto">
          <div className="font-serif font-bold text-xl mb-6">Arazzo <span className="text-[#FE7223] italic">Formation</span></div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🌸 Nos formations</span>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold mt-4 leading-tight">Choisissez votre formation</h1>
          <p className="text-white/85 mt-3">De la débutante à l’experte — chaque niveau est conçu pour réaliser vos projets.</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        <div className="-mt-10 bg-white border border-[#eee] rounded-3xl shadow-xl p-6 md:p-8">
          {/* #4 — Gros CTA : faire le test de niveau pour choisir sa formation. */}
          <a href="/offre#quiz"
            className="flex flex-col items-center text-center gap-1 mb-5 rounded-2xl border-2 border-dashed border-[#5B16F9]/50 bg-[#5B16F9]/5 px-5 py-6 hover:bg-[#5B16F9]/10 transition">
            <span className="text-3xl">📝</span>
            <strong className="text-lg text-[#2A0880]">Vous ne savez pas quel niveau choisir ?</strong>
            <span className="text-sm text-gray-600">Faites le test de niveau en 2 minutes — on vous conseille la bonne formation.</span>
            <span className="mt-2 inline-block bg-gradient-to-br from-[#FE7223] to-[#f2520a] text-white font-bold px-6 py-3 rounded-xl">Faire le test de niveau →</span>
          </a>

          <div className="grid gap-3">
            {NIVEAUX.map((n) => {
              const c = byId.get(n.id);
              const prix = c?.prix_dzd ? `${Number(c.prix_dzd).toLocaleString("fr-FR")} DA` : null;
              return (
                <Link key={n.slug} href={`/formation/${n.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[#e7e1f7] bg-[#faf8ff] hover:border-[#5B16F9] transition">
                  <span className="text-2xl">🎓</span>
                  <span className="flex-1">
                    <strong className="block">{c?.titre_fr || n.slug}</strong>
                    <small className="text-gray-500">{n.sous}{prix ? ` · ${prix}` : ""}</small>
                  </span>
                  <span className="text-[#5B16F9]">→</span>
                </Link>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Arazzo · École de couture</p>
        </div>
      </div>
    </main>
  );
}
