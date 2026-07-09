import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveLive {
  id: string;
  titre: string;
  live_url: string;
  audience: "public" | "group" | "link";
  access_token: string | null;
  group_id: string | null;
  formateurName: string;
  embedSrc: string | null;
  /** Si non intégrable (TikTok / Instagram) : lien à ouvrir + nom de la plateforme. */
  externalUrl: string | null;
  platform: string | null;
}

/**
 * Convertit un lien YouTube / Facebook en URL intégrable (iframe). Ces domaines
 * sont déjà autorisés par la CSP (frame-src). Renvoie null si non reconnu.
 */
export function liveEmbedSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  if (/(?:facebook\.com|fb\.watch|web\.facebook\.com)/i.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  }
  return null;
}

/**
 * Résout un lien de direct : intégrable (YouTube/Facebook) OU externe
 * (TikTok / Instagram → pas d'embed de live possible → bouton d'ouverture).
 * Renvoie platform=null si le lien n'est pas reconnu du tout.
 */
export function resolveLive(url: string | null | undefined): { embedSrc: string | null; externalUrl: string | null; platform: string | null } {
  if (!url) return { embedSrc: null, externalUrl: null, platform: null };
  const embed = liveEmbedSrc(url);
  if (embed) return { embedSrc: embed, externalUrl: null, platform: /youtu/i.test(url) ? "YouTube" : "Facebook" };
  if (/(?:tiktok\.com|vm\.tiktok\.com)/i.test(url)) return { embedSrc: null, externalUrl: url, platform: "TikTok" };
  if (/instagram\.com/i.test(url)) return { embedSrc: null, externalUrl: url, platform: "Instagram" };
  return { embedSrc: null, externalUrl: null, platform: null };
}

function toActive(row: any, formateurName: string): ActiveLive {
  const url = row.live_url ?? row.meet_url ?? "";
  const r = resolveLive(url);
  return {
    id: row.id, titre: row.titre ?? "Direct", live_url: url,
    audience: (row.audience ?? "public") as ActiveLive["audience"], access_token: row.access_token ?? null,
    group_id: row.group_id ?? null, formateurName,
    embedSrc: r.embedSrc, externalUrl: r.externalUrl, platform: r.platform,
  };
}

async function formateurName(admin: SupabaseClient, id: string | null): Promise<string> {
  if (!id) return "Arazzo";
  const { data } = await admin.from("users").select("nom").eq("id", id).maybeSingle();
  return data?.nom ?? "Arazzo";
}

/**
 * Le direct actif que CET utilisateur a le droit de voir :
 *  • 'public' → tout le monde ; • 'group' → membres du groupe ; • 'link' → jamais ici.
 * Renvoie le plus récent, ou null.
 */
export async function getActiveLiveForViewer(admin: SupabaseClient, userId: string): Promise<ActiveLive | null> {
  const { data: lives } = await admin
    .from("live_sessions")
    .select("id, titre, live_url, meet_url, audience, group_id, access_token, formateur_id, created_at")
    .eq("is_live", true)
    .order("created_at", { ascending: false })
    .limit(20);
  for (const row of lives ?? []) {
    if (row.audience === "public") return toActive(row, await formateurName(admin, row.formateur_id));
    if (row.audience === "group" && row.group_id) {
      const { data: m } = await admin.from("group_members").select("id").eq("group_id", row.group_id).eq("user_id", userId).maybeSingle();
      if (m) return toActive(row, await formateurName(admin, row.formateur_id));
    }
  }
  return null;
}

/** Direct accessible par jeton (audience 'link') — indépendant de tout groupe. */
export async function getLiveByToken(admin: SupabaseClient, token: string): Promise<ActiveLive | null> {
  if (!token) return null;
  const { data: row } = await admin
    .from("live_sessions")
    .select("id, titre, live_url, meet_url, audience, group_id, access_token, formateur_id, is_live")
    .eq("access_token", token).maybeSingle();
  if (!row || !row.is_live) return null;
  return toActive(row, await formateurName(admin, row.formateur_id));
}
