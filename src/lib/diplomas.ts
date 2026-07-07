import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;
export const DEFAULT_REQUIRED = 9;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/** Leçons d'un cours (id + titre + obligatoire), via chapitres. */
async function courseLessons(admin: Admin, courseId: string): Promise<{ id: string; titre: string; obligatoire: boolean }[]> {
  const { data } = await admin
    .from("lessons")
    .select("id, titre, devoir_obligatoire, chapters!inner(course_id)")
    .eq("chapters.course_id", courseId);
  return (data ?? []).map((l: any) => ({ id: l.id, titre: l.titre ?? "", obligatoire: !!l.devoir_obligatoire }));
}

export interface DiplomaProgress {
  approved: number;
  required: number;
  eligible: boolean;
  courseTitre: string;
  /** Titres des leçons OBLIGATOIRES encore non validées (pour l'explication à l'élève). */
  missingMandatory: string[];
}

/**
 * Progression diplôme d'une élève pour un cours.
 * Règle : si le cours a des leçons dont le devoir est marqué OBLIGATOIRE, le
 * diplôme exige que TOUTES ces leçons obligatoires aient un travail pratique
 * approuvé. Sinon (aucune leçon obligatoire), on retombe sur l'ancienne règle
 * (nombre de pratiques approuvées ≥ diploma_practicals_required).
 */
export async function getDiplomaProgress(admin: Admin, userId: string, courseId: string): Promise<DiplomaProgress> {
  const { data: course } = await admin
    .from("courses").select("titre_fr, diploma_practicals_required").eq("id", courseId).maybeSingle();
  const courseTitre = (course as { titre_fr?: string } | null)?.titre_fr ?? "";
  const fallbackRequired = (course as { diploma_practicals_required?: number } | null)?.diploma_practicals_required ?? DEFAULT_REQUIRED;

  const lessons = await courseLessons(admin, courseId);
  if (lessons.length === 0) return { approved: 0, required: fallbackRequired, eligible: false, courseTitre, missingMandatory: [] };

  // Ensemble des leçons validées (travail pratique approuvé).
  const { data: pr } = await admin
    .from("lesson_practicals").select("lesson_id").eq("user_id", userId).eq("status", "approved")
    .in("lesson_id", lessons.map((l) => l.id));
  const approvedSet = new Set((pr ?? []).map((p: { lesson_id: string }) => p.lesson_id));

  const mandatory = lessons.filter((l) => l.obligatoire);
  if (mandatory.length > 0) {
    const missingMandatory = mandatory.filter((l) => !approvedSet.has(l.id)).map((l) => l.titre);
    const approved = mandatory.length - missingMandatory.length;
    return { approved, required: mandatory.length, eligible: missingMandatory.length === 0, courseTitre, missingMandatory };
  }

  // Repli : ancienne règle par seuil.
  const approved = approvedSet.size;
  return { approved, required: fallbackRequired, eligible: approved >= fallbackRequired, courseTitre, missingMandatory: [] };
}

/** Cours auquel appartient une leçon. */
async function lessonCourseId(admin: Admin, lessonId: string): Promise<string | null> {
  const { data } = await admin.from("lessons").select("chapter:chapters(course_id)").eq("id", lessonId).maybeSingle();
  return ((data?.chapter as { course_id?: string } | null)?.course_id) ?? null;
}

async function notify(admin: Admin, userId: string, title: string, body: string, link = "/dashboard/diplome") {
  try { await admin.from("notifications").insert({ user_id: userId, type: "system", title, body, link }); } catch { /* ignore */ }
}

/**
 * Appelé après l'approbation d'un travail pratique : envoie les notifications de
 * progression, et au seuil atteint crée le diplôme (statut eligible) + email CNI.
 */
export async function handleApprovalProgress(admin: Admin, userId: string, lessonId: string) {
  const courseId = await lessonCourseId(admin, lessonId);
  if (!courseId) return;

  const prog = await getDiplomaProgress(admin, userId, courseId);

  // Diplôme déjà ouvert pour ce cours ?
  const { data: existing } = await admin
    .from("diplomas").select("id, status").eq("user_id", userId).eq("course_id", courseId).maybeSingle();

  if (prog.eligible) {
    if (existing) return; // déjà éligible / en cours
    const { data: u } = await admin.from("users").select("nom, email").eq("id", userId).maybeSingle();
    await admin.from("diplomas").insert({
      user_id: userId, course_id: courseId, status: "eligible",
      full_name: u?.nom ?? null, numero: `ARZ-${Date.now().toString(36).toUpperCase()}`,
    });
    await notify(admin, userId,
      "🎓 Diplôme débloqué !",
      `Bravo ! Vous avez validé assez de travaux pour « ${prog.courseTitre} ». Envoyez votre CNI pour recevoir votre diplôme officiel.`);

    if (u?.email) {
      const html = diplomaCniEmail(u.nom ?? "chère élève", prog.courseTitre);
      await sendEmail({ userId, to: u.email, category: "welcome", force: true,
        subject: "🎓 Votre diplôme Arazzo — dernière étape (CNI)", html });
    }
    return;
  }

  // Pas encore éligible.
  const remaining = prog.required - prog.approved;
  if (prog.missingMandatory.length > 0) {
    // Des devoirs OBLIGATOIRES manquent → diplôme en attente + explication précise.
    const liste = prog.missingMandatory.slice(0, 5).map((t) => `« ${t} »`).join(", ");
    const suite = prog.missingMandatory.length > 5 ? `, et ${prog.missingMandatory.length - 5} autre(s)` : "";
    await notify(admin, userId,
      "🎓 Diplôme en attente — devoir obligatoire",
      `Votre diplôme de « ${prog.courseTitre} » reste en attente : il vous reste ${prog.missingMandatory.length} devoir(s) OBLIGATOIRE(S) à faire valider — ${liste}${suite}. Ces leçons sont requises pour débloquer le diplôme.`);
  } else if (remaining > 0 && remaining <= 3) {
    await notify(admin, userId,
      remaining === 1 ? "Plus qu'un seul ! 🔥" : `Bravo, presque fini ! 🎉`,
      `Il vous reste ${remaining} travail/travaux pratique(s) à faire approuver pour débloquer votre diplôme de « ${prog.courseTitre} ».`);
  }
}

/** Email officiel demandant la CNI pour générer le diplôme physique. */
function diplomaCniEmail(nom: string, courseTitre: string): string {
  const prenom = nom.split(" ")[0] || "chère élève";
  return `
  <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
        <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
        <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
      </div>
      <div style="padding:34px;color:#444;line-height:1.7;font-size:15px;">
        <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">Félicitations ${prenom} 🎓</h2>
        <p>Après avoir terminé votre stage à l'école <strong>Arazzo</strong> (formation « ${courseTitre} »), nous vous demandons d'envoyer une <strong>photo de votre CNI</strong> afin de vérifier vos informations réelles et de générer votre <strong>diplôme officiel avec cachet humide</strong>.</p>
        <p style="background:#FBF3EC;border-radius:12px;padding:14px 16px;color:#7a4a1f;">📌 Ce n'est <strong>pas</strong> un diplôme électronique : vous le recevrez par <strong>société de livraison</strong> sous un délai d'<strong>une semaine</strong> après l'envoi de votre CNI.</p>
        <div style="text-align:center;margin:26px 0 8px;">
          <a href="${SITE}/dashboard/diplome" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Envoyer ma CNI</a>
        </div>
      </div>
      <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
    </div>
  </div>`;
}
