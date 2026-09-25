import { createClient } from "@/lib/supabase/server";
import FormationLanding from "./formation-landing";

// Landing NATIVE (24/7 sur Vercel, base Supabase du LMS). Chaque niveau vendu
// correspond à un cours du LMS. Le DESIGN est désormais identique à l'OS et à la
// landing présentielle (design partagé `@/lib/landing-kit`), mais le BACK-END
// reste natif au LMS : le formulaire écrit dans enrollment_requests / COD.
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

  // Nombre de séances RÉEL (leçons du cours), pas fixé à 16.
  const { data: chaps } = await supabase.from("chapters").select("id").eq("course_id", courseId);
  const chapIds = (chaps ?? []).map((c) => c.id);
  let sessions = chapIds.length;
  if (chapIds.length) {
    const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).in("chapter_id", chapIds);
    if (count) sessions = count;
  }

  const data = {
    courseId,
    niveau,
    name: nom,
    name_ar: course?.titre_ar ?? null,
    tagline: course?.description_fr ?? null,
    price_label: prix,
    sessions_count: sessions || null,
    program_url: programUrl,
  };

  return <FormationLanding data={data} />;
}
