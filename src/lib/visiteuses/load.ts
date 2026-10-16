import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles } from "@/lib/roles";
import { nomPublic } from "@/lib/nom-public";
import { avatarSur } from "@/lib/classe/vue";
import { loadFeedWelcome } from "@/lib/feed-welcome";
import { paquets } from "@/lib/student-care/paginate";
import { bunnyPlaybackUrls } from "@/lib/bunny/stream";
import {
  cadeauDebloque, defiEnCours, estInscriteSelon, etapesBienvenue, formationSuggeree,
  type DefiBrut, type EtapeBienvenue,
} from "./regles";

/**
 * Comptes SANS formation (« visiteuses ») — lectures côté serveur (clé de service).
 * Tout est résilient : une table absente (migration 103 non appliquée) ne fait jamais tomber le feed.
 */

export const MIGRATION_103 = "Missions et validation pas encore activées sur ce site (migration 103 à appliquer).";

/** Vrai si la migration 103 est appliquée. */
export async function migration103(admin: SupabaseClient): Promise<boolean> {
  const r = await admin.from("feed_missions").select("user_id").limit(1);
  return !r.error;
}

/** Inscrite (une formation ou l'équipe) ? Sinon : visiteuse. */
export async function estInscrite(admin: SupabaseClient, userId: string): Promise<boolean> {
  const [{ data: u }, ins] = await Promise.all([
    admin.from("users").select("role, roles").eq("id", userId).maybeSingle(),
    admin.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return estInscriteSelon({ roles: getRoles(u), inscriptions: ins.count ?? 0 });
}

/** Parmi ces personnes, celles qui sont inscrites (ou de l'équipe). Les autres portent la pastille « Visiteuse ». */
export async function inscritesParmi(admin: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const uniques = [...new Set(ids.filter(Boolean))];
  for (const lot of paquets(uniques, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const [u, e] = await Promise.all([
      admin.from("users").select("id, role, roles").in("id", lot),
      admin.from("enrollments").select("user_id").in("user_id", lot),
    ]);
    // En cas d'erreur de lecture, personne n'est marqué « Visiteuse » à tort.
    if (u.error || e.error) { lot.forEach((id) => out.add(id)); continue; }
    for (const p of (u.data ?? []) as { id: string; role: string | null; roles: string[] | null }[]) {
      if (estInscriteSelon({ roles: getRoles(p), inscriptions: 0 })) out.add(p.id);
    }
    for (const x of (e.data ?? []) as { user_id: string }[]) out.add(x.user_id);
  }
  return out;
}

const echapperLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Le niveau trouvé au dernier test de niveau passé avec cet e-mail (ou null). */
export async function niveauDuTest(admin: SupabaseClient, email: string | null | undefined): Promise<{ fait: boolean; niveau: string | null; libelle: string | null }> {
  if (!email) return { fait: false, niveau: null, libelle: null };
  const { data, error } = await admin.from("level_test_leads").select("level_key, level_label, created_at")
    .ilike("email", echapperLike(email.trim())).order("created_at", { ascending: false }).limit(1);
  if (error || !data?.length) return { fait: false, niveau: null, libelle: null };
  const l = data[0] as { level_key: string | null; level_label: string | null };
  return { fait: true, niveau: l.level_key, libelle: l.level_label };
}

export interface MissionsVue {
  /** Message si la migration 103 manque (missions partiellement disponibles). */
  migration: string | null;
  etapes: EtapeBienvenue[];
  /** Le cadeau : le code promo du moment, une fois les 4 étapes faites ; « bientot » s'il n'y a pas de code en ce moment. */
  cadeau: { code: string; detail: string | null } | "bientot" | null;
  /** L'enseignante à suivre. */
  enseignante: { id: string; nom: string; avatar: string | null; suivie: boolean } | null;
  /** La leçon d'essai gratuite (leçon « aperçu » de la 1ʳᵉ formation). */
  essai: { lessonId: string; titre: string; cours: string; vue: boolean } | null;
  defi: { id: string; titre: string; consigne: string; recompense: string; fin: string; participations: number; maParticipation: "en_attente" | "publiee" | null } | null;
  envies: { mediaId: string; titre: string; miniature: string | null; formation: { titre: string; href: string } }[];
  /** Gestes faits sur le feed (j'aime, commentaires, abonnements, réponses aux stories). */
  gestes: number;
  /** La formation à proposer pour « Rejoindre une classe ». */
  rejoindre: { titre: string; href: string };
  niveauTest: string | null;
}

type Admin = SupabaseClient;

async function compter(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try { const r = await q; return r.error ? 0 : r.count ?? 0; } catch { return 0; }
}

/** L'enseignante à suivre : la formatrice de la première formation publiée. */
async function enseignantePrincipale(admin: Admin): Promise<{ id: string; nom: string; avatar: string | null } | null> {
  const { data } = await admin.from("courses").select("formateur_id, ordre").eq("published", true).not("formateur_id", "is", null).order("ordre", { ascending: true }).limit(20);
  const id = ((data ?? []) as { formateur_id: string | null }[]).map((c) => c.formateur_id).find(Boolean);
  if (!id) return null;
  const { data: u } = await admin.from("users").select("id, nom, username, avatar_url, role, roles").eq("id", id).maybeSingle();
  if (!u) return null;
  return { id: u.id as string, nom: nomPublic(u as never), avatar: avatarSur((u.avatar_url as string | null) ?? null) };
}

/** La leçon d'essai : la première leçon « aperçu » de la première formation publiée. */
export async function leconEssai(admin: Admin, userId: string): Promise<MissionsVue["essai"]> {
  const { data, error } = await admin.from("lessons")
    .select("id, titre, ordre, chapter:chapters(ordre, course:courses(titre_fr, ordre, published))")
    .eq("is_preview", true).limit(100);
  if (error || !data?.length) return null;
  type L = { id: string; titre: string | null; ordre: number | null; chapter: { ordre: number | null; course: { titre_fr: string | null; ordre: number | null; published: boolean | null } | null } | null };
  const cle = (l: L) => [l.chapter?.course?.ordre ?? 9999, l.chapter?.ordre ?? 9999, l.ordre ?? 9999];
  const l = ((data as unknown as L[]).filter((x) => x.chapter?.course?.published))
    .sort((a, b) => { const [x, y] = [cle(a), cle(b)]; return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; })[0];
  if (!l) return null;
  const vue = await admin.from("activity_log").select("id").eq("user_id", userId).eq("action", "course_view").contains("meta", { lessonId: l.id }).limit(1);
  return { lessonId: l.id, titre: l.titre ?? "Leçon d'essai", cours: l.chapter?.course?.titre_fr ?? "Formation", vue: Boolean(vue.data?.length) };
}

async function defiDuMoment(admin: Admin, userId: string): Promise<MissionsVue["defi"]> {
  const { data, error } = await admin.from("defis").select("id, titre, consigne, recompense, debut, fin, gagnant_media_id").order("fin", { ascending: false }).limit(10);
  if (error) return null;
  const d = defiEnCours((data ?? []) as DefiBrut[], new Date());
  if (!d) return null;
  const { data: parts } = await admin.from("community_media").select("id, post:posts!inner(author_id, published, a_valider)").eq("defi_id", d.id).limit(1000);
  type P = { post: { author_id: string; published: boolean | null; a_valider: boolean | null } | null };
  const liste = (parts ?? []) as unknown as P[];
  const mienne = liste.find((p) => p.post?.author_id === userId);
  return {
    id: d.id, titre: d.titre, consigne: d.consigne, recompense: d.recompense, fin: d.fin,
    participations: liste.filter((p) => p.post?.published !== false).length,
    maParticipation: mienne ? (mienne.post?.a_valider ? "en_attente" : "publiee") : null,
  };
}

async function mesEnvies(admin: Admin, userId: string, niveauTest: string | null): Promise<MissionsVue["envies"]> {
  const { data, error } = await admin.from("feed_envies").select("media_id, titre, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error || !data?.length) return [];
  const ids = (data as { media_id: string }[]).map((x) => x.media_id);
  const { data: medias } = await admin.from("community_media").select("id, thumbnail_url, bunny_video_id, course:courses(slug, titre_fr)").in("id", ids);
  type M = { id: string; thumbnail_url: string | null; bunny_video_id: string | null; course: { slug: string | null; titre_fr: string | null } | null };
  const parId = new Map(((medias ?? []) as unknown as M[]).map((m) => [m.id, m]));
  return (data as { media_id: string; titre: string | null }[]).filter((x) => parId.has(x.media_id)).map((x) => {
    const m = parId.get(x.media_id)!;
    return {
      mediaId: x.media_id, titre: x.titre || "Un modèle du feed",
      miniature: m.thumbnail_url ?? (m.bunny_video_id ? bunnyPlaybackUrls(m.bunny_video_id).thumbnail : null),
      formation: formationSuggeree({ courseSlug: m.course?.slug ?? null, courseTitre: m.course?.titre_fr ?? null }, niveauTest),
    };
  });
}

/** Tout ce que le panneau « Missions » du feed affiche pour une visiteuse. */
export async function chargerMissions(admin: Admin, user: { id: string; email: string | null }): Promise<MissionsVue> {
  const dispo = await migration103(admin);
  const [test, prof, aimes, commentaires, abonnements, reponses, essai, defi, cadeauLigne] = await Promise.all([
    niveauDuTest(admin, user.email),
    enseignantePrincipale(admin),
    compter(admin.from("likes").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
    compter(admin.from("comments").select("id", { count: "exact", head: true }).eq("author_id", user.id)),
    admin.from("follows").select("following_id").eq("follower_id", user.id).limit(500),
    compter(admin.from("story_interactions").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
    leconEssai(admin, user.id),
    dispo ? defiDuMoment(admin, user.id) : Promise.resolve(null),
    dispo ? admin.from("feed_missions").select("cadeau_le").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const suivies = new Set(((abonnements.data ?? []) as { following_id: string }[]).map((x) => x.following_id));
  // « Suivre l'enseignante » : elle, ou n'importe quelle formatrice de l'école.
  let suitEnseignante = Boolean(prof && suivies.has(prof.id));
  if (!suitEnseignante && suivies.size) {
    const { data: staff } = await admin.from("users").select("id, role, roles").in("id", [...suivies].slice(0, 200));
    suitEnseignante = ((staff ?? []) as { role: string | null; roles: string[] | null }[]).some((p) => getRoles(p).includes("formateur"));
  }
  // « Question du jour » : une réponse/un vote sur une story — ou, à défaut, un commentaire.
  const repondu = await compter(admin.from("story_interactions").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("kind", ["reponse", "vote"]));
  const etapes = etapesBienvenue({ testFait: test.fait, suitEnseignante, aimes, aRepondu: repondu > 0 || commentaires > 0 });

  const deja = Boolean((cadeauLigne.data as { cadeau_le: string | null } | null)?.cadeau_le);
  let cadeau: MissionsVue["cadeau"] = null;
  if (cadeauDebloque(etapes, deja)) {
    // Acquis une fois pour toutes (même si elle retire un « j'aime » ensuite).
    if (dispo && !deja) await admin.from("feed_missions").upsert({ user_id: user.id, cadeau_le: new Date().toISOString() }, { onConflict: "user_id" });
    const { promo } = await loadFeedWelcome();
    cadeau = promo?.code ? { code: promo.code, detail: promo.discount_label ?? promo.message ?? null } : "bientot";
  }

  return {
    migration: dispo ? null : MIGRATION_103,
    etapes,
    cadeau,
    enseignante: prof ? { ...prof, suivie: suivies.has(prof.id) } : null,
    essai,
    defi,
    envies: dispo ? await mesEnvies(admin, user.id, test.niveau) : [],
    gestes: aimes + commentaires + suivies.size + reponses,
    rejoindre: formationSuggeree({ courseSlug: null, courseTitre: null }, test.niveau),
    niveauTest: test.libelle ?? test.niveau,
  };
}
