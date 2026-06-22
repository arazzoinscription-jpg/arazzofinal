import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Mes travaux pratiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-orange-50 text-orange-700",
  reviewed: "bg-violet-50 text-violet-700",
  approved: "bg-green-50 text-green-700",
};
const STATUS_LABEL: Record<string, string> = { submitted: "Soumis", reviewed: "Corrigé", approved: "Validé ✓" };

export default async function MyPracticalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/pratiques");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("lesson_practicals")
    .select("id, lesson_id, photo_url, video_url, note, feedback, status, created_at, lesson:lessons(titre, chapter:chapters(course:courses(titre_fr)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (rows ?? []).map((r: any) => ({
    id: r.id,
    lessonId: r.lesson_id,
    lessonTitre: r.lesson?.titre ?? "Leçon",
    courseTitre: r.lesson?.chapter?.course?.titre_fr ?? "",
    photo_url: r.photo_url,
    video_url: r.video_url,
    note: r.note,
    feedback: r.feedback,
    status: r.status as string,
    created_at: r.created_at,
  }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center"><Scissors size={22} /></span>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Mes travaux pratiques</h1>
          <p className="text-gray-500 dark:text-white/50 font-dm text-sm">Tous vos travaux soumis, toutes formations confondues.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">🪡</div>
          <p className="text-gray-400 font-dm">Vous n'avez pas encore soumis de travail pratique.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((it) => (
            <Link key={it.id} href={`/dashboard/cours/${it.lessonId}`}
              className="block bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{it.lessonTitre}</p>
                  {it.courseTitre && <p className="text-xs text-gray-400 truncate">{it.courseTitre}</p>}
                </div>
                <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[it.status] ?? ""}`}>{STATUS_LABEL[it.status] ?? it.status}</span>
              </div>
              {it.note && <p className="text-sm text-gray-600 dark:text-white/70 mb-2 line-clamp-2">{it.note}</p>}
              <div className="flex flex-wrap gap-3 mb-2">
                {it.photo_url && <img src={it.photo_url} alt="" className="w-20 h-20 object-cover rounded-lg border border-cream-200" />}
                {it.video_url && <video src={it.video_url} className="w-32 rounded-lg border border-cream-200" />}
              </div>
              {it.feedback && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-2.5 text-sm text-violet-800 dark:text-violet-200">
                  <span className="font-semibold">Retour formatrice :</span> {it.feedback}
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{new Date(it.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">Voir la leçon <ArrowRight size={14} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
