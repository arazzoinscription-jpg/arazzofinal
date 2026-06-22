import { redirect } from "next/navigation";
import { GraduationCap, CheckCircle2, Clock, Truck, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDiplomaProgress } from "@/lib/diplomas";
import { CniUpload } from "./cni-upload";

export const metadata = { title: "Mon diplôme — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function DiplomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/diplome");

  const admin = createAdminClient();
  const { data: enr } = await supabase
    .from("enrollments").select("course:courses(id, titre_fr)").eq("user_id", user.id);
  const courses = (enr ?? [])
    .map((e) => {
      const c = e.course as unknown;
      return (Array.isArray(c) ? c[0] : c) as { id: string; titre_fr: string } | null;
    })
    .filter(Boolean) as { id: string; titre_fr: string }[];

  const { data: dipRows } = await admin
    .from("diplomas").select("id, course_id, status, diploma_url").eq("user_id", user.id);
  const dipByCourse = new Map((dipRows ?? []).map((d) => [d.course_id, d]));

  const items = await Promise.all(courses.map(async (c) => ({
    course: c,
    progress: await getDiplomaProgress(admin, user.id, c.id),
    diploma: dipByCourse.get(c.id) as { id: string; status: string; diploma_url: string | null } | undefined,
  })));
  // On n'affiche que les cours ayant au moins un travail approuvé OU un diplôme en cours.
  const visible = items.filter((i) => i.progress.approved > 0 || i.diploma);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-2xl bg-violet-600/15 text-violet-600 dark:text-violet-300 flex items-center justify-center"><GraduationCap size={22} /></span>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Mon diplôme</h1>
          <p className="text-gray-500 dark:text-white/50 font-dm text-sm">Validez vos travaux pratiques pour débloquer votre diplôme officiel.</p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">🪡</div>
          <p className="text-gray-400 font-dm">Commencez à soumettre vos travaux pratiques pour avancer vers votre diplôme.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map(({ course, progress, diploma }) => {
            const pct = progress.required > 0 ? Math.min(100, Math.round((progress.approved / progress.required) * 100)) : 0;
            const status = diploma?.status;
            return (
              <div key={course.id} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{course.titre_fr}</h2>
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-300">{progress.approved}/{progress.required}</span>
                </div>
                <div className="h-2.5 rounded-full bg-cream-200 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT transition-all" style={{ width: `${pct}%` }} />
                </div>

                {!progress.eligible && !diploma && (
                  <p className="text-sm text-gray-500 dark:text-white/50 font-dm mt-3">
                    Plus que <strong>{progress.required - progress.approved}</strong> travaux pratiques approuvés pour débloquer votre diplôme 🎓
                  </p>
                )}

                {status === "eligible" && (
                  <>
                    <p className="text-sm text-green-700 dark:text-green-300 font-semibold mt-3 flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Diplôme débloqué ! Envoyez votre CNI pour le recevoir.
                    </p>
                    <CniUpload diplomaId={diploma!.id} />
                  </>
                )}
                {status === "cni_uploaded" && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold mt-3 flex items-center gap-1.5">
                    <Clock size={16} /> CNI reçue — vérification en cours. Votre diplôme sera généré puis expédié.
                  </p>
                )}
                {status === "generated" && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-green-700 dark:text-green-300 font-semibold flex items-center gap-1.5"><Truck size={16} /> Diplôme généré — expédition sous ~1 semaine.</span>
                    {diploma?.diploma_url && (
                      <a href={diploma.diploma_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:underline">
                        <Download size={15} /> Aperçu PDF
                      </a>
                    )}
                  </div>
                )}
                {status === "shipped" && (
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold mt-3 flex items-center gap-1.5">
                    <Truck size={16} /> Diplôme expédié 📦
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
