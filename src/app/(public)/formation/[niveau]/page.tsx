import { createClient } from "@/lib/supabase/server";
import InscriptionForm from "./inscription-form";

// Landing NATIVE (24/7 sur Vercel, base Supabase du LMS). Chaque niveau vendu
// correspond à un cours du LMS (mapping confirmé par les vraies inscriptions).
const MAP: Record<string, string> = {
  "niveau-1": "23bee490-103a-492d-9253-256178658e02",
  "niveau-2": "b100190c-4f95-4f63-bd22-7a561f9666de",
  "niveau-3": "de1da439-6dc9-4cf0-9526-e44af4c5073b",
};

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ niveau: string }> }) {
  const { niveau } = await params;
  const courseId = MAP[niveau];
  if (!courseId) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center text-gray-600">
        Cette formation n’existe pas.
      </main>
    );
  }
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("titre_fr, titre_ar, prix_dzd, description_fr, slug")
    .eq("id", courseId)
    .maybeSingle();

  const nom = course?.titre_fr || "Formation en couture";
  const prix = course?.prix_dzd ? `${Number(course.prix_dzd).toLocaleString("fr-FR")} DA` : null;
  const programUrl = course?.slug ? `/formations/${course.slug}` : "/formations";

  // #3 — Nombre de séances RÉEL (leçons du cours), pas fixé à 16.
  const { data: chaps } = await supabase.from("chapters").select("id").eq("course_id", courseId);
  const chapIds = (chaps ?? []).map((c) => c.id);
  let sessions = chapIds.length;
  if (chapIds.length) {
    const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).in("chapter_id", chapIds);
    if (count) sessions = count;
  }

  return (
    <main className="min-h-screen bg-[#f6f3ff] text-[#1a1230]">
      <header className="bg-gradient-to-br from-[#4a17c9] via-[#2A0880] to-[#22076b] text-white px-6 py-14 border-b-4 border-[#FE7223]">
        <div className="max-w-2xl mx-auto">
          <div className="font-serif font-bold text-xl mb-6">Arazzo <span className="text-[#FE7223] italic">Formation</span></div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🎓 Formation en ligne</span>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold mt-4 leading-tight">{nom}</h1>
          {course?.description_fr ? <p className="text-white/85 mt-3 leading-relaxed">{course.description_fr}</p> : null}
          <div className="flex flex-wrap gap-2 mt-5">
            {prix ? <span className="text-sm font-semibold bg-[#FE7223] rounded-full px-3.5 py-1.5">💳 {prix}</span> : null}
            {sessions ? <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">🎓 {sessions} séances</span> : null}
            <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">🖥️ Sur la plateforme</span>
            <span className="text-sm font-semibold bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5">♾️ Accès à vie</span>
          </div>
          {/* #1 — Lien vert : les cours sont sur la plateforme. */}
          <a href="https://www.formation-arazzo.store/formations"
            className="inline-flex items-center gap-2 mt-4 bg-[#128a4c] text-white font-semibold text-sm rounded-full px-4 py-2 hover:brightness-110">
            📚 Tous les cours sont sur la plateforme arazzo-formation.store →
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        <div className="-mt-10 bg-white border border-[#eee] rounded-3xl shadow-xl p-6 md:p-10">
          <details className="rounded-xl border-2 border-[#e0453a] bg-[#e0453a]/5 mb-3">
            <summary className="cursor-pointer font-bold px-4 py-3 text-[#c23b30]">📌 Dossier obligatoire au centre</summary>
            <div className="px-4 pb-4 text-sm leading-relaxed" dir="rtl">
              <p className="font-bold my-1">الملف الإجباري للتسجيل في المركز</p>
              <p className="my-1">يُشترط على كل متربصة إيداع ملف التسجيل كاملاً لدى مركز التكوين.</p>
              <p className="my-1">Copie de la pièce d’identité · نسخة من بطاقة التعريف</p>
              <p className="my-1">1 photo · صورة واحدة</p>
              <p className="my-1">Frais d’inscription · حقوق التسجيل : <b>500 DA</b></p>
            </div>
          </details>
          <details className="rounded-xl border border-[#e7e1f7] bg-[#faf8ff] mb-4">
            <summary className="cursor-pointer font-bold px-4 py-3">➕ En plus (options) · خدمات إضافية</summary>
            <div className="px-4 pb-4 text-sm leading-relaxed">
              <p className="my-1">Pack vidéos de finition (accès à vie) — <b>4 000 DA</b></p>
              <p className="my-1">Séance spéciale : machine à coudre — <b>2 000 DA</b></p>
              <p className="my-1">Atelier spécialisé (modèle précis) — <b>1 500–2 500 DA</b>/séance</p>
              <p className="my-2 text-gray-500">⭐ Selon vos choix · حسب اختياراتكم</p>
            </div>
          </details>

          {/* #2 — Deux boutons côte à côte, sous les bénéfices/contenu. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            <a href="https://www.formation-arazzo.store/formations"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#5B16F9] text-[#2A0880] font-semibold hover:bg-[#5B16F9]/5">
              🖥️ Je préfère en ligne
            </a>
            <a href={programUrl}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#FE7223] text-[#c2510a] font-semibold hover:bg-[#FE7223]/5">
              📋 Voir le programme
            </a>
          </div>

          <InscriptionForm courseId={courseId} />
          <p className="text-center text-xs text-gray-400 mt-6">Arazzo · École de couture</p>
        </div>
      </div>
    </main>
  );
}
