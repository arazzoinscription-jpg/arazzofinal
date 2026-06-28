import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bunnyPlaybackUrls } from "@/lib/bunny/stream";
import type { CommunityItem } from "@/lib/community-types";

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
  return {
    id: r.id,
    postId: r.post_id,
    sourceType: r.source_type,
    mediaKind: r.media_kind,
    videoHls: bunny?.hls ?? null,
    mediaUrl: r.media_url ?? null,
    thumbnail: r.thumbnail_url ?? bunny?.thumbnail ?? null,
    caption: post.content ?? null,
    createdAt: r.created_at,
    author: {
      id: post.author?.id ?? "",
      nom: post.author?.nom ?? "Utilisateur",
      avatar_url: post.author?.avatar_url ?? null,
      role: post.author?.role ?? "eleve",
    },
    likeCount: likes.length,
    liked: likes.some((l) => l.user_id === meId),
    commentCount: (post.comments ?? []).length,
    cta: buildCta(r),
  };
}

const SELECT = `
  id, post_id, source_type, media_kind, bunny_video_id, media_url, thumbnail_url, created_at,
  course_id, patron_id,
  post:posts!inner(id, content, author_id, published, author:users(id, nom, avatar_url, role), likes(user_id), comments(id)),
  course:courses(slug, titre_fr),
  patron:patrons(id, titre)
`;

/** Feed global « Pour toi » — réservé aux inscrits, plus récent d'abord. */
export async function loadCommunityFeed(): Promise<{ me: { id: string } | null; items: CommunityItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { me: null, items: [] };

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("community_media")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (rows ?? [])
    .filter((r: any) => r.post && (r.post.published ?? true))
    .map((r: any) => mapRow(r, user.id));

  return { me: { id: user.id }, items };
}

/** Médias publiés par un utilisateur (page profil). */
export async function loadUserMedia(userId: string): Promise<{ me: { id: string } | null; items: CommunityItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { me: null, items: [] };

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("community_media")
    .select(SELECT)
    .eq("post.author_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  const items = (rows ?? [])
    .filter((r: any) => r.post && (r.post.published ?? true))
    .map((r: any) => mapRow(r, user.id));

  return { me: { id: user.id }, items };
}

/** Nombre d'abonnés d'un membre + si l'utilisateur courant le suit. */
export async function loadFollowInfo(targetId: string, meId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId);
  const { data } = await admin
    .from("follows").select("follower_id").eq("follower_id", meId).eq("following_id", targetId).maybeSingle();
  return { followers: count ?? 0, isFollowing: !!data };
}

/** Profil public de base. */
export async function loadProfile(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users").select("id, nom, username, avatar_url, role, bio").eq("id", userId).maybeSingle();
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
