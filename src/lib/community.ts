import { createClient } from "@/lib/supabase/server";
import { nomPublic } from "@/lib/nom-public";
import { createAdminClient } from "@/lib/supabase/admin";
import { bunnyPlaybackUrls } from "@/lib/bunny/stream";
import { isFacebookVideoUrl, type CommunityItem } from "@/lib/community-types";
import { cdnImage } from "@/lib/storage-cdn";
import { inscritesParmi } from "@/lib/visiteuses/load";

export type { CommunityItem, SourceType } from "@/lib/community-types";
export { sourceLabel } from "@/lib/community-types";

function buildCta(r: any): { label: string; href: string } | null {
  if (r.source_type === "course_teaser" && r.course?.slug) return { label: "S'inscrire au cours complet", href: `/formations/${r.course.slug}` };
  if (r.source_type === "patron_demo" && r.patron_id) return { label: "Acheter le patron", href: `/patrons/${r.patron_id}` };
  if (r.source_type === "practical" && r.course?.slug) return { label: "Voir le cours", href: `/formations/${r.course.slug}` };
  return null;
}

function mapRow(r: any, meId: string): CommunityItem {
  const post = r.post ?? {};
  const likes = (post.likes ?? []) as { user_id: string }[];
  const bunny = r.bunny_video_id ? bunnyPlaybackUrls(r.bunny_video_id) : null;
  // Vidéo Facebook partagée : détectée par l'URL (stockée dans media_url) → libellé « Facebook ».
  const isFb = isFacebookVideoUrl(r.media_url);
  return {
    id: r.id,
    postId: r.post_id,
    sourceType: isFb ? "facebook" : r.source_type,
    mediaKind: r.media_kind,
    videoHls: bunny?.hls ?? null,
    mediaUrl: r.media_url ?? null,
    thumbnail: r.thumbnail_url ?? bunny?.thumbnail ?? null,
    caption: post.content ?? null,
    createdAt: r.created_at,
    author: {
      id: post.author?.id ?? "",
      // Vie privée : jamais le nom complet d'une élève (pseudo, ou initiales + numéro).
      nom: post.author ? nomPublic(post.author) : "Membre",
      avatar_url: cdnImage(post.author?.avatar_url ?? null),
      role: post.author?.role ?? "eleve",
    },
    likeCount: likes.length,
    liked: likes.some((l) => l.user_id === meId),
    commentCount: (post.comments ?? []).length,
    cta: buildCta(r),
    music: r.music_url ? { url: r.music_url, title: r.music_title ?? null } : null,
  };
}

const SELECT_BASE = `
  id, post_id, source_type, media_kind, bunny_video_id, media_url, thumbnail_url, created_at,
  course_id, patron_id,
  post:posts!inner(id, content, author_id, published, author:users(id, nom, username, avatar_url, role, roles), likes(user_id), comments(id)),
  course:courses(slug, titre_fr),
  patron:patrons(id, titre)
`;

// Variante avec les colonnes musique (migration 089). On l'essaie d'abord, et si
// la migration n'est pas encore appliquée (colonnes absentes), on retombe sur
// SELECT_BASE → le feed ne casse jamais.
const SELECT = `
  id, post_id, source_type, media_kind, bunny_video_id, media_url, thumbnail_url, created_at,
  course_id, patron_id, music_url, music_title,
  post:posts!inner(id, content, author_id, published, author:users(id, nom, username, avatar_url, role, roles), likes(user_id), comments(id)),
  course:courses(slug, titre_fr),
  patron:patrons(id, titre)
`;

/** Vrai si l'erreur PostgREST vient des colonnes musique pas encore créées. */
function isMissingMusicColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || /music_(url|title)/.test(error.message ?? "");
}

/** Mélange (Fisher-Yates) : un ordre différent à chaque ouverture du feed. */
function melanger<T>(liste: T[]): T[] {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Les VÊTEMENTS réalisés en travaux pratiques arrivent seuls dans le feed : chaque travail pratique qui a une VIDÉO
 * (le devoir demande « une vidéo d'une pièce cousue ») et n'est pas encore partagé devient une publication (auteur =
 * l'élève, lien « Voir le cours »). Les PHOTOS seules ne sont PAS partagées : ce sont surtout les résumés et dessins
 * du cahier. Par lots ; best-effort.
 *
 * Exécuté par le cron de nuit (/api/cron/nightly) — PLUS pendant l'ouverture du feed : à chaque démarrage à froid
 * d'un serveur, la passe lisait jusqu'à 5 500 lignes et créait les publications une par une AVANT d'afficher le feed.
 */
export async function partagerTravauxPratiques(admin: ReturnType<typeof createAdminClient>): Promise<{ partages: number }> {
  let crees = 0;
  try {
    const { data: deja } = await admin.from("community_media").select("practical_id").not("practical_id", "is", null).limit(5000);
    const partages = new Set((deja ?? []).map((r: any) => r.practical_id));
    const { data: travaux } = await admin
      .from("lesson_practicals")
      .select("id, user_id, video_url, note, created_at, lesson:lessons(chapter:chapters(course_id))")
      .not("video_url", "is", null)
      .neq("video_url", "")
      .order("created_at", { ascending: false })
      .limit(500);
    const nouveaux = (travaux ?? []).filter((t: any) => !partages.has(t.id)).slice(0, 60);
    for (const t of nouveaux as any[]) {
      // eslint-disable-next-line no-await-in-loop
      const { data: post } = await admin.from("posts")
        .insert({ author_id: t.user_id, group_id: null, content: t.note ?? null, published: true })
        .select("id").single();
      if (!post) continue;
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from("community_media").insert({
        post_id: post.id, source_type: "practical", media_kind: "video", media_url: t.video_url, thumbnail_url: null,
        course_id: t.lesson?.chapter?.course_id ?? null, practical_id: t.id, status: "ready",
      });
      // eslint-disable-next-line no-await-in-loop
      if (error) await admin.from("posts").delete().eq("id", post.id);
      else crees += 1;
    }
  } catch { /* best-effort */ }
  return { partages: crees };
}

/** Feed global « Pour toi » — ouvert à tous ; ordre ALÉATOIRE à chaque ouverture (un nouveau modèle à chaque visite). */
export async function loadCommunityFeed(): Promise<{ me: { id: string } | null; items: CommunityItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le feed est consultable par les VISITEURS (non connectés) : on charge les vidéos
  // dans tous les cas ; l'invitation à s'inscrire est gérée côté client.

  const admin = createAdminClient();
  // On prend un large choix (les 300 plus récents), puis on MÉLANGE : à chaque ouverture, un ordre différent.
  // 1) Liste LÉGÈRE (identifiants seulement) des 300 plus récents publiés…
  const { data: legers } = await admin
    .from("community_media")
    .select("id, post:posts!inner(published)")
    .order("created_at", { ascending: false })
    .limit(300);
  const choisis = melanger((legers ?? [])
    .filter((r: any) => r.post && (r.post.published ?? true)))
    .slice(0, 60)
    .map((r: any) => r.id as string);
  if (!choisis.length) return { me: user ? { id: user.id } : null, items: [] };

  // 2) …puis le DÉTAIL (auteur, j'aime, commentaires) des 60 affichés seulement — avant, les 300
  //    étaient chargés avec tous leurs « j'aime » pour en montrer 60.
  const run = (sel: string) => admin.from("community_media").select(sel).in("id", choisis);
  let { data: rows, error } = await run(SELECT);
  if (isMissingMusicColumn(error)) ({ data: rows } = await run(SELECT_BASE));
  const parId = new Map((rows ?? []).map((r: any) => [r.id as string, r]));
  const items = choisis
    .map((id) => parId.get(id))
    .filter((r: any) => r && r.post && (r.post.published ?? true))
    .map((r: any) => mapRow(r, user?.id ?? ""));

  await enrichirVisiteuses(admin, items, user?.id ?? null);
  await ajouterSonPropre(admin, items);
  return { me: user ? { id: user.id } : null, items };
}

/**
 * Comptes sans formation (migration 103) : pastille « Visiteuse » des autrices, titre du défi d'une participation,
 * « J'aimerais apprendre ce modèle » déjà touché. Best-effort : sans la migration, rien ne change.
 */
/** « Son propre » des vidéos (migration 107), lu à part : sans la colonne, rien ne change (jamais d'erreur). */
async function ajouterSonPropre(admin: ReturnType<typeof createAdminClient>, items: CommunityItem[]): Promise<void> {
  const ids = items.filter((i) => i.mediaKind === "video").map((i) => i.id);
  if (!ids.length) return;
  const r = await admin.from("community_media").select("id, son_propre").in("id", ids.slice(0, 500));
  if (r.error) return;
  const son = new Map(((r.data ?? []) as { id: string; son_propre: boolean | null }[]).map((x) => [x.id, x.son_propre]));
  for (const it of items) if (son.has(it.id)) it.sonPropre = son.get(it.id) ?? null;
}

async function enrichirVisiteuses(admin: ReturnType<typeof createAdminClient>, items: CommunityItem[], meId: string | null): Promise<void> {
  if (!items.length) return;
  try {
    const eleves = items.filter((it) => it.author.id && it.author.role === "eleve").map((it) => it.author.id);
    const ids = items.map((it) => it.id);
    const [inscrites, defis, envies] = await Promise.all([
      eleves.length ? inscritesParmi(admin, eleves) : Promise.resolve(new Set<string>()),
      admin.from("community_media").select("id, defi:defis(titre)").in("id", ids).not("defi_id", "is", null),
      meId ? admin.from("feed_envies").select("media_id").eq("user_id", meId).in("media_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    const titres = new Map(((defis.error ? [] : defis.data ?? []) as any[]).map((r) => [r.id as string, (Array.isArray(r.defi) ? r.defi[0]?.titre : r.defi?.titre) as string | undefined]));
    const mesEnvies = new Set(((envies.error ? [] : envies.data ?? []) as { media_id: string }[]).map((x) => x.media_id));
    for (const it of items) {
      if (it.author.role === "eleve" && it.author.id) it.author.visiteuse = !inscrites.has(it.author.id);
      if (titres.get(it.id)) it.defi = titres.get(it.id);
      it.envie = mesEnvies.has(it.id);
    }
  } catch { /* le feed s'affiche sans ces détails */ }
}

/** Médias publiés par un utilisateur (page profil). */
export async function loadUserMedia(userId: string): Promise<{ me: { id: string } | null; items: CommunityItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Profil PUBLIC : consultable sans connexion (me = null pour un visiteur).

  const admin = createAdminClient();
  const run = (sel: string) => admin
    .from("community_media")
    .select(sel)
    .eq("post.author_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  let { data: rows, error } = await run(SELECT);
  if (isMissingMusicColumn(error)) ({ data: rows } = await run(SELECT_BASE));

  const items = (rows ?? [])
    .filter((r: any) => r.post && (r.post.published ?? true))
    .map((r: any) => mapRow(r, user?.id ?? ""));

  await ajouterSonPropre(admin, items);
  return { me: user ? { id: user.id } : null, items };
}

/** Nombre d'abonnés d'un membre + si l'utilisateur courant le suit. */
export async function loadFollowInfo(targetId: string, meId: string | null) {
  const admin = createAdminClient();
  // Abonnés = qui suit la cible ; Abonnements = qui la cible suit.
  // meId null/vide (visiteur) → on ne teste pas isFollowing (UUID requis par PostgREST).
  const [{ count: followers }, { count: following }, { data }] = await Promise.all([
    admin.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId),
    admin.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetId),
    meId
      ? admin.from("follows").select("follower_id").eq("follower_id", meId).eq("following_id", targetId).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  return { followers: followers ?? 0, following: following ?? 0, isFollowing: !!data };
}

/** Profil public de base. */
export async function loadProfile(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users").select("id, nom, username, avatar_url, role, roles, bio").eq("id", userId).maybeSingle();
  if (data) data.avatar_url = cdnImage(data.avatar_url ?? null);
  return data;
}

export interface PortfolioItem { id: string; title: string; image: string | null; priceDzd: number; href: string; }
export interface CreatorPortfolio { kind: "courses" | "patrons"; items: PortfolioItem[]; }

/**
 * Portfolio public d'un créateur : les FORMATIONS publiées d'un formateur, ou
 * les PATRONS d'un patronniste. Utilisé sur le profil communauté à la place du
 * « parcours d'apprentissage » réservé aux élèves.
 */
export async function loadCreatorPortfolio(userId: string, role: string): Promise<CreatorPortfolio | null> {
  const admin = createAdminClient();

  if (role === "formateur" || role === "admin") {
    const { data } = await admin
      .from("courses")
      .select("id, titre_fr, slug, thumbnail, prix_dzd")
      .eq("formateur_id", userId).eq("published", true)
      .order("created_at", { ascending: false });
    const items: PortfolioItem[] = (data ?? []).map((c) => ({
      id: c.id as string,
      title: (c.titre_fr as string) ?? "Formation",
      image: (c.thumbnail as string) ?? null,
      priceDzd: Number(c.prix_dzd) || 0,
      href: `/formations/${(c.slug as string) ?? ""}`,
    }));
    return { kind: "courses", items };
  }

  if (role === "patronniste") {
    const { data } = await admin
      .from("patrons")
      .select("id, titre, preview_url, prix_dzd")
      .eq("formateur_id", userId)
      .order("created_at", { ascending: false });
    const items: PortfolioItem[] = (data ?? []).map((p) => ({
      id: p.id as string,
      title: (p.titre as string) ?? "Patron",
      image: (p.preview_url as string) ?? null,
      priceDzd: Number(p.prix_dzd) || 0,
      href: `/patrons/${p.id as string}`,
    }));
    return { kind: "patrons", items };
  }

  return null;
}

export interface JourneyCourse {
  titre: string;
  slug: string | null;
  enrolledAt: string;
  pct: number;
  done: boolean;
  daysToFinish: number | null;
}
export interface StudentJourney {
  startedAt: string | null;
  coursesCount: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  avgScore: number | null;
  quizzesPassed: number;
  xp: number;
  currentStreak: number;
  courses: JourneyCourse[];
}

/** Parcours d'apprentissage d'un élève (pour la page profil — « Suivre l'aventure »). */
export async function loadStudentJourney(userId: string, lang: "fr" | "ar" | "en" = "fr"): Promise<StudentJourney> {
  const admin = createAdminClient();
  const [{ data: usr }, { data: enr }, { data: prog }, { data: quiz }] = await Promise.all([
    admin.from("users").select("created_at, xp_total, total_points, current_streak").eq("id", userId).maybeSingle(),
    admin.from("enrollments").select("course_id, paid_at, course:courses(titre_fr, titre_ar, titre_en, slug, chapters(lessons(id)))").eq("user_id", userId).order("paid_at", { ascending: true }),
    admin.from("progress").select("lesson_id, completed_at").eq("user_id", userId),
    admin.from("quiz_attempts").select("score, passed").eq("student_id", userId),
  ]);

  const doneAt = new Map<string, string>();
  for (const p of prog ?? []) doneAt.set(p.lesson_id, p.completed_at);

  const pickTitle = (c: any) => (lang === "ar" ? c?.titre_ar || c?.titre_fr : lang === "en" ? c?.titre_en || c?.titre_fr : c?.titre_fr) ?? "Formation";

  let lessonsCompleted = 0, lessonsTotal = 0;
  const courses: JourneyCourse[] = (enr ?? []).map((e: any) => {
    const c = e.course ?? {};
    const lessonIds: string[] = (c.chapters ?? []).flatMap((ch: any) => (ch.lessons ?? []).map((l: any) => l.id));
    const total = lessonIds.length;
    const doneIds = lessonIds.filter((id) => doneAt.has(id));
    const done = doneIds.length;
    lessonsTotal += total; lessonsCompleted += done;
    const isDone = total > 0 && done >= total;
    let daysToFinish: number | null = null;
    if (isDone && e.paid_at) {
      const last = doneIds.map((id) => +new Date(doneAt.get(id)!)).reduce((a, b) => Math.max(a, b), 0);
      daysToFinish = Math.max(0, Math.round((last - +new Date(e.paid_at)) / 86400000));
    }
    return { titre: pickTitle(c), slug: c.slug ?? null, enrolledAt: e.paid_at, pct: total ? Math.round((done / total) * 100) : 0, done: isDone, daysToFinish };
  });

  const scored = (quiz ?? []).filter((q: any) => typeof q.score === "number");
  const avgScore = scored.length ? Math.round(scored.reduce((s: number, q: any) => s + q.score, 0) / scored.length) : null;

  return {
    startedAt: (enr ?? [])[0]?.paid_at ?? usr?.created_at ?? null,
    coursesCount: (enr ?? []).length,
    lessonsCompleted, lessonsTotal,
    avgScore,
    quizzesPassed: (quiz ?? []).filter((q: any) => q.passed).length,
    xp: usr?.xp_total ?? usr?.total_points ?? 0,
    currentStreak: usr?.current_streak ?? 0,
    courses,
  };
}

/**
 * Résultats de modèles publiés depuis moins de 24 h (alerte « Bravo ! » du feed), noms PUBLICS.
 * Tableau vide si la migration 100 n'est pas appliquée ou en cas d'erreur (le feed ne casse jamais).
 */
export async function loadResultatsRecents(): Promise<import("@/lib/resultats").ResultatVue[]> {
  const admin = createAdminClient();
  const depuis = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data, error } = await admin
    .from("community_media")
    .select("id, media_kind, media_url, bunny_video_id, thumbnail_url, created_at, post:posts!inner(content, published, author:users(id, nom, username, avatar_url, role, roles))")
    .eq("source_type", "student_result")
    .gte("created_at", depuis)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return ((data ?? []) as any[])
    .filter((r) => r.post && (r.post.published ?? true) && r.post.author)
    .map((r) => ({
      id: r.id as string,
      auteurId: r.post.author.id as string,
      auteur: nomPublic(r.post.author),
      avatar: cdnImage(r.post.author.avatar_url ?? null),
      kind: r.media_kind as "image" | "video",
      mediaUrl: r.media_url ?? null,
      videoHls: r.bunny_video_id ? bunnyPlaybackUrls(r.bunny_video_id).hls : null,
      thumbnail: r.thumbnail_url ?? null,
      legende: r.post.content ?? null,
      createdAt: r.created_at as string,
    }));
}
