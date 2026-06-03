import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedPost, FeedComment, CurrentUser } from "@/components/feed/types";

/**
 * Charge le fil d'actualités (global si groupId = null, sinon celui du groupe).
 *
 * La lecture des données passe par le client admin (service role) car la RLS
 * `users_read_own` empêche un client utilisateur de lire le profil des AUTRES
 * auteurs (nom/avatar). L'accès est donc contrôlé explicitement ici :
 *  - feed global : visible par tout utilisateur authentifié ;
 *  - feed de groupe : réservé au créateur et aux membres.
 */
export async function loadFeed(groupId: string | null): Promise<{ me: CurrentUser | null; posts: FeedPost[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { me: null, posts: [] };

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const me: CurrentUser = { id: user.id, role: prof?.role ?? "eleve" };

  const admin = createAdminClient();

  // Contrôle d'accès pour les feeds de groupe : membre ou créateur uniquement
  if (groupId !== null) {
    const { data: g } = await admin.from("groups").select("creator_id").eq("id", groupId).single();
    let allowed = g?.creator_id === user.id;
    if (!allowed) {
      const { data: m } = await admin
        .from("group_members").select("id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      allowed = !!m;
    }
    if (!allowed) return { me, posts: [] };
  }

  let query = admin
    .from("posts")
    .select(`
      id, content, created_at, author_id,
      author:users(id, nom, role, avatar_url),
      post_images(image_url, expired, uploaded_at),
      likes(user_id),
      comments(id, content, created_at, author_id, author:users(id, nom, role, avatar_url))
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  query = groupId === null ? query.is("group_id", null) : query.eq("group_id", groupId);

  const { data: rows } = await query;

  const posts: FeedPost[] = (rows ?? []).map((r: any) => {
    const comments: FeedComment[] = (r.comments ?? [])
      .map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author_id: c.author_id,
        author: {
          id: c.author?.id,
          nom: c.author?.nom ?? "Utilisateur",
          role: c.author?.role ?? "eleve",
          avatar_url: c.author?.avatar_url ?? null,
        },
      }))
      .sort((a: FeedComment, b: FeedComment) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const likes = (r.likes ?? []) as { user_id: string }[];

    return {
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      author_id: r.author_id,
      author: {
        id: r.author?.id,
        nom: r.author?.nom ?? "Utilisateur",
        role: r.author?.role ?? "eleve",
        avatar_url: r.author?.avatar_url ?? null,
      },
      images: (r.post_images ?? []).map((i: any) => {
        // Règle des 48h appliquée à l'affichage, même avant le passage du cron de purge
        const tooOld = i.uploaded_at ? Date.now() - new Date(i.uploaded_at).getTime() > 48 * 60 * 60 * 1000 : false;
        const expired = i.expired || tooOld;
        return { image_url: expired ? null : i.image_url, expired };
      }),
      likeCount: likes.length,
      liked: likes.some((l) => l.user_id === me.id),
      comments,
    };
  });

  return { me, posts };
}
