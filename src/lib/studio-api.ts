// -----------------------------------------------------------------------------
// Arazzo Studio — client de l'« Arazzo Engine » (backend Flask local).
//
// Modèle HYBRIDE : le site Next.js (déployé) tourne dans le navigateur de la
// formatrice, qui appelle son moteur Python LOCAL (127.0.0.1:5000, CORS activé).
// Aucune vidéo ne transite par le cloud ; tout le traitement reste sur son PC.
// -----------------------------------------------------------------------------

export const ENGINE_URL =
  (process.env.NEXT_PUBLIC_STUDIO_API || "http://127.0.0.1:5000").replace(/\/$/, "");

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`Engine ${res.status}`);
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body?: unknown) =>
  req<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

// ---- Types (miroir de l'API Flask) ------------------------------------------
export type Health = { ok: boolean; engine: string; reels: number };

export type Reel = {
  id: string;
  best_title?: string;
  category?: string;
  duration?: number;
  ai_score?: number;
  score?: number;
  ai_confidence?: number | null;
  status?: string;
  pillar?: string;
  rubric?: string;
  source_video?: string;
  created_date?: string;
  ai_badges?: string[];
};

export type ReelsResp = {
  count: number;
  reels: Reel[];
  bunny?: boolean;
  stream?: boolean;
  trash?: number;
};

export type Agent = {
  id: string;
  label: string;
  emoji: string;
  weight: number;
  confidence: number;
  enabled: boolean;
  state: string;
  stats?: { calls?: number; avg?: number | null };
};

export type Cat = { key: string; emoji: string; label: string };
export type PillarsResp = { pillars: Cat[]; counts: Record<string, number>; missing?: string | null };
export type RubricsResp = { rubrics: Cat[]; counts: Record<string, number> };

// ---- URLs média (servies par l'Engine) --------------------------------------
export const mediaThumb = (id: string) => `${ENGINE_URL}/media/thumb/${id}`;
export const mediaClip = (id: string) => `${ENGINE_URL}/media/clip/${id}`;
export const editorUrl = (id: string) => `${ENGINE_URL}/editor?id=${encodeURIComponent(id)}`;

// ---- API ---------------------------------------------------------------------
export const StudioAPI = {
  health: () => get<Health>("/api/health"),
  reels: () => get<ReelsResp>("/api/reels"),
  agents: () => get<{ count: number; agents: Agent[] }>("/api/agents"),
  search: (q: string) =>
    get<{ count: number; results: { video: string; start: number; text: string }[] }>(
      `/api/search?q=${encodeURIComponent(q)}`,
    ),
  pillars: () => get<PillarsResp>("/api/pillars"),
  rubrics: () => get<RubricsResp>("/api/rubrics"),
  setPillar: (id: string, pillar: string) =>
    post<{ ok: boolean }>(`/api/reels/${id}/pillar`, { pillar }),
  setRubric: (id: string, rubric: string) =>
    post<{ ok: boolean }>(`/api/reels/${id}/rubric`, { rubric }),
};
