import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
const DAY = 1000 * 60 * 60 * 24;

// Réglages (jours d'inactivité / d'attente avant relance)
const CONTINUE_AFTER_DAYS = 3; // vidéo commencée mais laissée depuis 3 jours
const PRACTICAL_AFTER_DAYS = 2; // leçon terminée depuis 2 jours sans travail envoyé
const MAX_PER_RUN = 300;        // plafond de relances par passage

const key = (u: string, l: string) => `${u}|${l}`;
function chunk<T>(a: T[], n: number): T[][] { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

async function lessonInfo(admin: Admin, lessonIds: string[]) {
  const map = new Map<string, { titre: string; coursTitre: string }>();
  for (const part of chunk(lessonIds, 300)) {
    const { data } = await admin.from("lessons").select("id, titre, chapter:chapters(course:courses(titre_fr))").in("id", part);
    for (const l of (data ?? []) as any[]) {
      const ch = Array.isArray(l.chapter) ? l.chapter[0] : l.chapter;
      const co = ch ? (Array.isArray(ch.course) ? ch.course[0] : ch.course) : null;
      map.set(l.id, { titre: l.titre ?? "votre leçon", coursTitre: co?.titre_fr ?? "votre formation" });
    }
  }
  return map;
}
async function studentsInfo(admin: Admin, userIds: string[]) {
  const map = new Map<string, { nom: string; email: string }>();
  for (const part of chunk(userIds, 300)) {
    const { data } = await admin.from("users").select("id, nom, email, role").in("id", part);
    for (const u of (data ?? []) as { id: string; nom: string | null; email: string | null; role: string | null }[]) {
      if ((u.role ?? "eleve") === "eleve" && u.email) map.set(u.id, { nom: u.nom ?? "", email: u.email });
    }
  }
  return map;
}
async function pairSet(admin: Admin, table: string, userIds: string[], lessonIds: string[], extra?: (q: any) => any): Promise<Set<string>> {
  const set = new Set<string>();
  if (!userIds.length || !lessonIds.length) return set;
  for (const uPart of chunk(userIds, 300)) {
    let q = admin.from(table).select("user_id, lesson_id").in("user_id", uPart).in("lesson_id", lessonIds);
    if (extra) q = extra(q);
    const { data } = await q;
    for (const r of (data ?? []) as { user_id: string; lesson_id: string }[]) set.add(key(r.user_id, r.lesson_id));
  }
  return set;
}

/** Tente de « réserver » l'envoi (anti-doublon via UNIQUE) ; false si déjà envoyé. */
async function claim(admin: Admin, userId: string, lessonId: string, kind: "continue" | "practical"): Promise<boolean> {
  const { error } = await admin.from("learning_reminders").insert({ user_id: userId, lesson_id: lessonId, kind });
  return !error; // conflit d'unicité → error → déjà réservé
}

/**
 * Relances pédagogiques : envoie AU PLUS un email par élève/leçon/type et par
 * passage. Appelée par le dispatcher cron « morning » (plan Hobby : pas de 3e cron).
 */
export async function runLearningReminders(admin: Admin) {
  const now = Date.now();
  const result = { continue: 0, practical: 0, skipped: 0 };
  let budget = MAX_PER_RUN;

  // ══ 1) « Continuez votre cours » : vidéo commencée (10–90%) laissée depuis N jours ══
  {
    const cutoff = new Date(now - CONTINUE_AFTER_DAYS * DAY).toISOString();
    const { data: vp } = await admin
      .from("video_progress")
      .select("user_id, lesson_id, watched_pct, updated_at")
      .eq("watched_complete", false)
      .gte("watched_pct", 10).lt("watched_pct", 90)
      .lte("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(400);
    const cands = (vp ?? []).map((v: { user_id: string; lesson_id: string }) => ({ u: v.user_id, l: v.lesson_id })).filter((c) => c.u && c.l);
    if (cands.length) {
      const userIds = [...new Set(cands.map((c) => c.u))];
      const lessonIds = [...new Set(cands.map((c) => c.l))];
      const completed = await pairSet(admin, "progress", userIds, lessonIds);       // leçon déjà terminée → ne pas relancer
      const already = await pairSet(admin, "learning_reminders", userIds, lessonIds, (q) => q.eq("kind", "continue"));
      const lInfo = await lessonInfo(admin, lessonIds);
      const sInfo = await studentsInfo(admin, userIds);

      for (const c of cands) {
        if (budget <= 0) break;
        if (completed.has(key(c.u, c.l)) || already.has(key(c.u, c.l))) continue;
        const s = sInfo.get(c.u); const l = lInfo.get(c.l);
        if (!s || !l) continue;
        if (!(await claim(admin, c.u, c.l, "continue"))) continue; // déjà pris
        // Notification uniquement (in-app + push via webhook) — plus d'email (quota).
        await admin.from("notifications").insert({
          user_id: c.u, type: "system",
          title: "🎯 Continuez votre formation — vous y êtes presque !",
          body: `Reprenez « ${l.coursTitre} » là où vous vous êtes arrêtée.`,
          link: `/dashboard/cours/${c.l}`,
        });
        result.continue++;
        budget--;
      }
    }
  }

  // ══ 2) « Envoyez votre travail pratique » : leçon terminée (avec devoir) sans travail ══
  {
    const { data: devoirLessons } = await admin.from("lessons").select("id").not("devoir", "is", null).limit(3000);
    const devoirSet = new Set((devoirLessons ?? []).map((l: { id: string }) => l.id));
    if (devoirSet.size) {
      const cutoff = new Date(now - PRACTICAL_AFTER_DAYS * DAY).toISOString();
      const { data: prog } = await admin
        .from("progress")
        .select("user_id, lesson_id, completed_at")
        .lte("completed_at", cutoff)
        .order("completed_at", { ascending: false })
        .limit(600);
      const cands = (prog ?? [])
        .map((p: { user_id: string; lesson_id: string }) => ({ u: p.user_id, l: p.lesson_id }))
        .filter((c) => c.u && c.l && devoirSet.has(c.l));
      if (cands.length) {
        const userIds = [...new Set(cands.map((c) => c.u))];
        const lessonIds = [...new Set(cands.map((c) => c.l))];
        const hasPractical = await pairSet(admin, "lesson_practicals", userIds, lessonIds); // déjà envoyé un travail → stop
        const already = await pairSet(admin, "learning_reminders", userIds, lessonIds, (q) => q.eq("kind", "practical"));
        const lInfo = await lessonInfo(admin, lessonIds);
        const sInfo = await studentsInfo(admin, userIds);

        for (const c of cands) {
          if (budget <= 0) break;
          if (hasPractical.has(key(c.u, c.l)) || already.has(key(c.u, c.l))) continue;
          const s = sInfo.get(c.u); const l = lInfo.get(c.l);
          if (!s || !l) continue;
          if (!(await claim(admin, c.u, c.l, "practical"))) continue;
          // Notification uniquement (in-app + push via webhook) — plus d'email (quota).
          await admin.from("notifications").insert({
            user_id: c.u, type: "system",
            title: "✂️ Envoyez votre travail pratique et gagnez des points",
            body: `Leçon « ${l.titre} » terminée : envoyez votre travail pour « ${l.coursTitre} ».`,
            link: `/dashboard/cours/${c.l}`,
          });
          result.practical++;
          budget--;
        }
      }
    }
  }

  return { ok: true, ...result };
}
