import Link from "next/link";
import PresentielForm from "./presentiel-form";

// Landing PRÉSENTIELLE native (24/7, sur Vercel). Capture les prospects (nom,
// WhatsApp, wilaya, créneaux) et les envoie par e-mail à l'administratrice —
// le présentiel se confirme par téléphone. Aucune dépendance à Arazzo OS.

export const dynamic = "force-dynamic";

// Titres lisibles pour les offres connues ; sinon on embellit le slug.
const TITRES: Record<string, string> = {
  "presentiel-niveau-1": "Formation en couture — Niveau 1 (présentiel, Sétif)",
  "presentiel-niveau-2": "Formation en couture — Niveau 2 (présentiel, Sétif)",
  "presentiel-niveau-3": "Formation en couture — Niveau 3 (présentiel, Sétif)",
};

function joli(slug: string) {
  const s = decodeURIComponent(slug).replace(/^presentiel-/, "").replace(/-/g, " ").trim();
  return s ? `Formation présentielle — ${s.charAt(0).toUpperCase()}${s.slice(1)} (Sétif)` : "Formation présentielle (Sétif)";
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const nom = TITRES[slug] || joli(slug);

  return (
    <main className="min-h-screen bg-[#f6f3ff] text-[#1a1230]">
      <header className="bg-gradient-to-br from-[#4a17c9] via-[#2A0880] to-[#22076b] text-white px-6 py-14 border-b-4 border-[#FE7223]">
        <div className="max-w-2xl mx-auto">
          <div className="font-serif font-bold text-xl mb-6">Arazzo <span className="text-[#FE7223] italic">Formation</span></div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🏫 Formation en présentiel</span>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold mt-4 leading-tight">{nom}</h1>
          <p className="text-white/85 mt-3 leading-relaxed">En groupe, au centre à Sétif — accompagnement direct par la formatrice.</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">📍 Sétif</span>
            <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">👥 Petits groupes</span>
            <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">🧵 Pratique en salle</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        <div className="-mt-10 bg-white border border-[#eee] rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="font-serif text-xl font-semibold text-[#2A0880] mb-1">Laissez vos coordonnées</h2>
          <p className="text-sm text-gray-500 mb-5">Nous vous rappelons sur WhatsApp pour confirmer votre place et le créneau.</p>

          <PresentielForm offer={nom} />

          <div className="mt-6 rounded-xl border border-[#e7e1f7] bg-[#faf8ff] p-4 text-sm text-gray-600">
            💡 Vous préférez apprendre à distance ?{" "}
            <Link href="/offres" className="text-[#5B16F9] font-semibold hover:underline">Voir les formations en ligne →</Link>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">Arazzo · École de couture — Sétif</p>
        </div>
      </div>
    </main>
  );
}
