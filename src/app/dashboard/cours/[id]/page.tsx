import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseAccess } from "@/lib/subscriptions";
import { logActivity } from "@/lib/activity";
import { LessonWatch } from "@/components/player/lesson-watch";
import { LessonSidebar } from "./lesson-sidebar";
import { LessonQA, type QA } from "./lesson-qa";
import { LessonPractical, type Practical } from "./lesson-practical";
import { PayNextInstallmentButton } from "./pay-next-installment";
import { Section } from "./section";
import { TravauxAutres } from "./travaux-autres";
import { CarteEnseignante } from "@/components/presence/carte-enseignante";
import { BarreActiviteCours } from "@/components/presence/activite";
import { avatarSur } from "@/lib/classe/vue";
import { nomPublic } from "@/lib/nom-public";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select(`
      *,
      chapter:chapters(
        *,
        course:courses(
          id, titre_fr, slug, min_watch_pct, formateur_id,
          chapters(
            id, titre, ordre,
            lessons(id, titre, ordre, duree_minutes, is_preview)
          )
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (!lesson) notFound();

  const course = (lesson.chapter as any)?.course;

  // Devoir du cours (migration 027) — lecture résiliente : "" si la colonne n'existe pas encore.
  let courseHomework = "";
  if (course?.id) {
    const { data: hw } = await supabase.from("courses").select("homework").eq("id", course.id).maybeSingle();
    courseHomework = ((hw as { homework?: string | null } | null)?.homework) ?? "";
  }

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", course?.id)
    .single();

  if (!enrollment && !(lesson as any).is_preview) {
    redirect(`/formations/${course?.slug ?? ""}`);
  }

  // Get user progress for this course
  const { data: progressData } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user.id);

  const completedLessons = new Set(progressData?.map((p) => p.lesson_id));

  // Journal d'activité : consultation de leçon (dédoublonné sur 30 min)
  {
    const admin = createAdminClient();
    const { data: recent } = await admin
      .from("activity_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "course_view")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .contains("meta", { lessonId: lesson.id })
      .maybeSingle();
    if (!recent) {
      await logActivity(user.id, "course_view", {
        lessonId: lesson.id, lessonTitre: lesson.titre, courseTitre: course?.titre_fr,
      });
    }
  }

  // Progression vidéo sauvegardée (reprise + % regardé)
  const { data: vp } = await supabase
    .from("video_progress")
    .select("last_position_sec, watched_pct")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  // Quiz rattachés à cette leçon (évaluation / pratique)
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, type, min_score")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: true });

  // Rôle + propriété du cours (pour l'accès aux travaux pratiques)
  const { data: meProf } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  const isStaff = isFormateur(meProf);
  const canViewAllPracticals = isAdmin(meProf) || (isFormateur(meProf) && course?.formateur_id === user.id);

  const extrasAdmin = createAdminClient();

  // Drip abonnement : accès aux chapitres selon les tranches payées (staff = accès total).
  const access = await getCourseAccess(extrasAdmin, user.id, course?.id ?? "");
  const currentChapterId = (lesson.chapter as any)?.id as string | undefined;
  const lockedChapterIds = new Set<string>();
  if (access.isSubscription && !isStaff) {
    for (const ch of ((course?.chapters as any[]) ?? [])) {
      if (access.isChapterLocked(ch.id)) lockedChapterIds.add(ch.id);
    }
  }
  const lessonLocked =
    access.isSubscription && !isStaff && !(lesson as any).is_preview &&
    !!currentChapterId && access.isChapterLocked(currentChapterId);
  const lockedUnlockMonth = currentChapterId ? (access.unlockMonthByChapter[currentChapterId] ?? 0) : 0;

  // Chapitre pas encore ouvert → écran de déblocage (la sidebar reste navigable).
  if (lessonLocked) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-1">
              {(lesson.chapter as any)?.course?.titre_fr} · {(lesson.chapter as any)?.titre}
            </p>
            <h1 className="font-playfair text-2xl font-bold text-gray-900">{lesson.titre}</h1>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-8 text-center">
            <span className="inline-flex w-14 h-14 rounded-full bg-violet-100 text-violet-600 items-center justify-center mb-3">
              <Lock size={26} />
            </span>
            <h2 className="font-playfair text-xl font-bold text-gray-900">Chapitre verrouillé</h2>
            <p className="text-sm text-gray-600 font-dm mt-2 max-w-md mx-auto">
              Ce chapitre s'ouvre au <strong>mois {lockedUnlockMonth}</strong> de votre abonnement
              (tranches payées : {access.unlockedMonths}/{access.totalMonths}).
              Vous pouvez <strong>payer le mois suivant dès maintenant</strong> pour débloquer la suite,
              sans attendre la fin du mois en cours.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <PayNextInstallmentButton courseId={course?.id ?? ""} targetMonth={lockedUnlockMonth}
                label={`Débloquer jusqu'au mois ${lockedUnlockMonth}`} />
              <p className="text-xs text-gray-400 max-w-md">
                Impossible de sauter un mois : la facture cumule les mois impayés jusqu'au mois {lockedUnlockMonth}.
              </p>
              <Link href="/dashboard/commandes" className="text-sm text-gray-500 hover:text-orange-600 hover:underline">
                Voir mes commandes & factures →
              </Link>
            </div>
          </div>
        </div>
        <LessonSidebar
          chapters={(course?.chapters as any[]) ?? []}
          currentLessonId={lesson.id}
          completedLessons={completedLessons}
          lockedChapterIds={lockedChapterIds}
          unlockMonthByChapter={access.unlockMonthByChapter}
        />
      </div>
    );
  }

  // Nom d'une autre personne tel que la personne connectée doit le voir (équipe : vrai nom ; élève : nom public).
  const nomVu = (id: string, a: { nom?: string | null; username?: string | null; role?: string | null; roles?: string[] | null } | null | undefined, defaut: string) =>
    !a ? defaut : id === user.id || isStaff ? ((a.nom ?? "").trim() || defaut) : nomPublic({ id, ...a });

  const { data: qRows } = await extrasAdmin
    .from("lesson_questions")
    .select("id, content, created_at, user_id, parent_id, author:users(nom, username, role, roles)")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: true });
  const qa: QA[] = (qRows ?? []).map((q: any) => ({
    id: q.id, content: q.content, created_at: q.created_at, user_id: q.user_id, parent_id: q.parent_id,
    // Vie privée : les élèves voient le nom PUBLIC des autres élèves ; l'équipe voit les vrais noms.
    authorName: nomVu(q.user_id, q.author, "Utilisateur"), authorRole: q.author?.role ?? "eleve",
  }));

  let pQuery = extrasAdmin
    .from("lesson_practicals")
    .select("id, user_id, photo_url, video_url, annotation_url, note, feedback, status, created_at, author:users(nom)")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: false });
  if (!canViewAllPracticals) pQuery = pQuery.eq("user_id", user.id);
  const { data: pRows } = await pQuery;
  // Les travaux des AUTRES élèves de cette leçon (pour s'inspirer) : photos / vidéos / note, SANS les retours ni les
  // corrections de la formatrice (qui restent privés entre elle et l'élève).
  const { data: autresRows } = await extrasAdmin
    .from("lesson_practicals")
    .select("id, user_id, photo_url, video_url, note, status, created_at, author:users(nom, username, role, roles)")
    .eq("lesson_id", lesson.id)
    .neq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(120);
  const autres: Practical[] = (autresRows ?? []).filter((p: any) => p.photo_url || p.video_url).map((p: any) => ({
    id: p.id, user_id: p.user_id, photo_url: p.photo_url, video_url: p.video_url, annotation_url: null, note: p.note,
    feedback: null, status: p.status, created_at: p.created_at, authorName: nomVu(p.user_id, p.author, "Élève"),
  }));

  // Leçon précédente / suivante dans l'ordre du programme (jamais une leçon d'un chapitre verrouillé).
  const ordre = [...(((course?.chapters as any[]) ?? []))].sort((a, b) => a.ordre - b.ordre)
    .flatMap((ch: any) => [...((ch.lessons as any[]) ?? [])].sort((a: any, b: any) => a.ordre - b.ordre)
      .filter((l: any) => !lockedChapterIds.has(ch.id) || l.is_preview));
  const ici = ordre.findIndex((l: any) => l.id === lesson.id);
  const prevHref = ici > 0 ? `/dashboard/cours/${ordre[ici - 1].id}` : null;
  const nextHref = ici >= 0 && ici < ordre.length - 1 ? `/dashboard/cours/${ordre[ici + 1].id}` : null;

  const practicals: Practical[] = (pRows ?? []).map((p: any) => ({
    id: p.id, user_id: p.user_id, photo_url: p.photo_url, video_url: p.video_url, annotation_url: p.annotation_url ?? null, note: p.note,
    feedback: p.feedback, status: p.status, created_at: p.created_at, authorName: p.author?.nom ?? "Élève",
  }));

  // L'enseignante du cours (photo, présence, profil, contact) — pas affichée à l'enseignante elle-même.
  let enseignante: { id: string; nom: string; avatar: string | null } | null = null;
  if (course?.formateur_id && course.formateur_id !== user.id) {
    const { data: prof } = await createAdminClient().from("users").select("id, nom, avatar_url").eq("id", course.formateur_id).maybeSingle();
    if (prof) enseignante = { id: prof.id as string, nom: ((prof.nom as string | null) ?? "").trim() || "Votre enseignante", avatar: avatarSur(prof.avatar_url as string | null) };
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Lesson player */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">
            {(lesson.chapter as any)?.course?.titre_fr} · {(lesson.chapter as any)?.titre}
          </p>
          <h1 className="font-playfair text-2xl font-bold text-gray-900">
            {lesson.titre}
          </h1>
        </div>

        {access.isSubscription && access.unlockedMonths < access.totalMonths && (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-violet-800 font-dm">
              Abonnement : <strong>{access.unlockedMonths}/{access.totalMonths}</strong> mois débloqués.
              Payez le mois suivant en avance pour ouvrir la suite.
            </span>
            <PayNextInstallmentButton courseId={course?.id ?? ""} variant="soft" label="Payer le mois suivant" />
          </div>
        )}

        {/* L'enseignante, tout en haut sur téléphone (devant le programme et la vidéo) */}
        {enseignante ? <div className="lg:hidden"><CarteEnseignante enseignante={enseignante} compacte /></div> : null}

        {/* Programme du cours EN HAUT sur téléphone (juste devant la vidéo) */}
        <LessonSidebar
          variant="mobile"
          chapters={(course?.chapters as any[]) ?? []}
          currentLessonId={lesson.id}
          completedLessons={completedLessons}
          lockedChapterIds={lockedChapterIds}
          unlockMonthByChapter={access.unlockMonthByChapter}
        />

        {/* Ce que je fais maintenant (petites icônes, expliqué en français et en arabe), juste devant la vidéo */}
        <BarreActiviteCours />

        <LessonWatch
          prevHref={prevHref}
          nextHref={nextHref}
          lessonId={lesson.id}
          courseId={course?.id}
          videoUrl={lesson.video_url_bunny}
          initialPosition={vp?.last_position_sec ?? 0}
          initialPct={vp?.watched_pct ?? 0}
          minPct={course?.min_watch_pct ?? 80}
          isCompleted={completedLessons.has(lesson.id)}
        />

        {lesson.duree_minutes && (
          <div className="mt-4 text-sm text-gray-400">⏱ {lesson.duree_minutes} minutes</div>
        )}

        {/* Quiz de la leçon */}
        {(quizzes ?? []).length > 0 && (
          <div className="mt-6 space-y-3">
            {(quizzes ?? []).map((q) => (
              <a
                key={q.id}
                href={`/dashboard/quiz/${q.id}`}
                className="flex items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-blush-50 border border-orange-100 rounded-2xl p-4 hover:shadow-soft transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{q.type === "practical" ? "📷" : "📝"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 font-dm truncate">{q.title}</p>
                    <p className="text-xs text-gray-500 font-dm">
                      {q.type === "practical"
                        ? "Travail pratique à soumettre · +50 XP"
                        : `Quiz · score minimum ${q.min_score}%`}
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 bg-orange-DEFAULT text-white text-sm px-4 py-2 rounded-xl font-semibold group-hover:bg-orange-600 transition-colors">
                  {q.type === "practical" ? "Soumettre" : "Passer le quiz"} →
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Sous la vidéo : tout dans UNE LISTE — un clic sur une ligne l'ouvre. */}
        <div className="mt-6 space-y-3">
          {((lesson as { devoir?: string | null }).devoir || courseHomework) ? (
            <Section icone="📋" titre="Travaux à faire" badge={(lesson as { devoir_obligatoire?: boolean | null }).devoir_obligatoire ? "★ Obligatoire" : null} ouvert>
        {/* Devoir à faire (consigne du formateur, niveau leçon) */}
        {(lesson as { devoir?: string | null }).devoir && (
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blush-50 p-5">
            <div className="flex items-center flex-wrap gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-xl bg-violet-DEFAULT/15 text-violet-700 flex items-center justify-center"><ClipboardList size={18} /></span>
              <h3 className="font-playfair text-xl font-bold text-gray-900">Devoir à faire — cette leçon</h3>
              {(lesson as { devoir_obligatoire?: boolean | null }).devoir_obligatoire ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                  ★ Obligatoire pour le diplôme
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  Facultatif
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 font-dm whitespace-pre-line leading-relaxed">{(lesson as { devoir?: string | null }).devoir}</p>
            <p className="text-xs text-violet-700/80 font-dm mt-3">
              {(lesson as { devoir_obligatoire?: boolean | null }).devoir_obligatoire
                ? "★ Cette leçon est requise pour débloquer votre diplôme. Importez votre travail ci-dessous."
                : "↓ Importez votre travail ci-dessous, dans « Travaux pratiques »."}
            </p>
          </div>
        )}

        {/* Devoir à faire (consigne du formateur, niveau cours) */}
        {courseHomework && (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-blush-50 p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/15 text-orange-600 flex items-center justify-center"><ClipboardList size={18} /></span>
              <h3 className="font-playfair text-xl font-bold text-gray-900">Devoir à faire</h3>
            </div>
            <p className="text-sm text-gray-700 font-dm whitespace-pre-line leading-relaxed">{courseHomework}</p>
            <p className="text-xs text-orange-700/80 font-dm mt-3">↓ Importez votre travail ci-dessous, dans « Travaux pratiques ».</p>
          </div>
        )}

            </Section>
          ) : null}
          <Section icone="💬" titre="Questions / Réponses" compte={qa.filter((q) => !q.parent_id).length}>
            <LessonQA lessonId={lesson.id} items={qa} meId={user.id} isStaff={isStaff} />
          </Section>
          <Section icone="🪡" titre={isStaff ? "Travaux pratiques des élèves" : "Mes travaux pratiques"} compte={practicals.length}>
            <LessonPractical lessonId={lesson.id} meId={user.id} isStaff={isStaff} submissions={practicals} />
          </Section>
          {!canViewAllPracticals ? (
            <Section icone="👀" titre="Les travaux des autres élèves" compte={autres.length}>
              <TravauxAutres travaux={autres} />
            </Section>
          ) : null}
        </div>
      </div>

      {/* Colonne de droite (ordinateur) : l'enseignante en haut, puis le programme. Sur téléphone, tout est en haut. */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 flex-shrink-0 gap-4">
        {enseignante ? <CarteEnseignante enseignante={enseignante} /> : null}
        <LessonSidebar
          variant="desktop"
          chapters={(course?.chapters as any[]) ?? []}
          currentLessonId={lesson.id}
          completedLessons={completedLessons}
          lockedChapterIds={lockedChapterIds}
          unlockMonthByChapter={access.unlockMonthByChapter}
        />
      </div>
    </div>
  );
}
