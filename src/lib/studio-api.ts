// -----------------------------------------------------------------------------
// Arazzo Studio — client de l'« Arazzo Engine » (backend Flask local).
//
// Modèle HYBRIDE : le site Next.js (déployé) tourne dans le navigateur de la
// formatrice, qui appelle son moteur Python LOCAL (127.0.0.1:5000, CORS activé).
// Aucune vidéo ne transite par le cloud ; tout le traitement reste sur son PC.
// -----------------------------------------------------------------------------

// Le moteur a maintenant une adresse PERMANENTE (tunnel nommé Cloudflare sur le
// domaine d'Arazzo). Depuis le site déployé, on la vise directement : plus rien
// à copier-coller. L'URL reste surchargeable à chaud (localStorage) au cas où.
const PERMANENT_ENGINE_URL = "https://engine.formation-arazzo.store";
const DEFAULT_ENGINE_URL =
  (process.env.NEXT_PUBLIC_STUDIO_API || "http://127.0.0.1:5000").replace(/\/$/, "");
const ENGINE_KEY = "arazzo_engine_url";

function resolveEngineUrl(): string {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(ENGINE_KEY);
    // Les anciennes adresses « quick tunnel » étaient éphémères : une fois la
    // session finie elles ne répondent plus, et celle restée en mémoire faisait
    // croire à une panne du Studio. On les oublie d'office.
    if (saved && saved.includes("trycloudflare.com")) {
      window.localStorage.removeItem(ENGINE_KEY);
    } else if (saved) {
      return saved.replace(/\/$/, "");
    }
    // Site déployé (https) → l'adresse permanente. En dev local → 127.0.0.1.
    if (window.location.protocol === "https:") return PERMANENT_ENGINE_URL;
  }
  return DEFAULT_ENGINE_URL;
}

// `let` volontaire : réévalué quand la formatrice change l'URL du tunnel.
export let ENGINE_URL = resolveEngineUrl();

/** Enregistre (ou efface si vide) l'URL du moteur et la renvoie. */
export function setEngineUrl(url: string): string {
  const clean = url.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") {
    if (clean) window.localStorage.setItem(ENGINE_KEY, clean);
    else window.localStorage.removeItem(ENGINE_KEY);
  }
  // Vidé → on retombe sur l'adresse permanente (site) ou locale (dev), pas sur
  // une valeur figée : c'est le bouton « remettre par défaut ».
  ENGINE_URL = clean || resolveEngineUrl();
  return ENGINE_URL;
}

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
export const sourceUrl = (id: string) => `${ENGINE_URL}/media/source/${id}`;
/** Transforme un chemin renvoyé par l'Engine ("/media/preview/x.mp4") en URL complète. */
export const engineMedia = (path: string) => `${ENGINE_URL}${path}`;
export const videoUrl = (stem: string) => `${ENGINE_URL}/media/video/${encodeURIComponent(stem)}`;
export const downloadUrl = (file: string) => `${ENGINE_URL}/download/${file}`;
export const editorUrl = (id: string) => `${ENGINE_URL}/editor?id=${encodeURIComponent(id)}`;

export type VideoItem = { stem: string; duration: number; segments: number };
export type Marker = {
  id: string; type: string; emoji: string; code: string;
  start: number; end: number; reason: string; score: number; action: string;
  decision?: string | null;
};
export type TimelineResp = {
  video?: string; count: number; counts: Record<string, number>;
  markers: Marker[]; duration?: number; error?: string;
};
export type CoachResp = { recommendations: { level: string; msg: string }[]; note?: string };
export type PipelineResp = { pipeline: string[]; agents_actifs: number; agents_total: number };

export type Segment = { start: number; end: number };
export type ReelFull = Reel & {
  start?: number;
  end?: number;
  segments?: Segment[];
  ai_reasons?: string[];
  ai_explain?: string[];
  ai_breakdown?: Record<string, number>;
};
export type ExportOpts = {
  codec?: string;
  res?: string;
  logo?: boolean;
  template?: boolean;
  denoise?: boolean;
  format?: string;
};
export type ExportStatus = {
  active: boolean;
  step: string;
  pct: number;
  file?: string | null;
  error?: string | null;
};

/** Aperçu léger : l'Engine ne renvoie JAMAIS la source brute (4K HEVC, plusieurs Go),
 *  mais un extrait 480p. `offset` = position de cet extrait dans le temps de la source. */
export type PreviewResp = {
  kind?: "clip" | "window";
  url?: string | null;
  offset?: number;
  win_start?: number;
  win_end?: number;
  light?: boolean;
  ready?: boolean;
  key?: string;
  have_source?: boolean;
  error?: string;
};
export type PreviewStatus = {
  ready: boolean;
  url?: string | null;
  pct?: number;
  active?: boolean;
  error?: string | null;
};

// ---- API ---------------------------------------------------------------------
export const StudioAPI = {
  health: () => get<Health>("/api/health"),
  reels: () => get<ReelsResp>("/api/reels"),
  agents: () => get<{ count: number; agents: Agent[] }>("/api/agents"),
  search: (q: string) =>
    get<{ count: number; results: { video: string; start: number; text: string }[] }>(
      `/api/search?q=${encodeURIComponent(q)}`,
    ),
  reel: (id: string) => get<ReelFull>(`/api/reel/${id}`),
  preview: (id: string) => get<PreviewResp>(`/api/reels/${id}/preview`),
  previewStatus: (key: string) =>
    get<PreviewStatus>(`/api/preview/status?key=${encodeURIComponent(key)}`),
  exportReel: (id: string, opts: ExportOpts) =>
    post<{ ok?: boolean; error?: string }>(`/api/reels/${id}/export`, opts),
  exportStatus: () => get<ExportStatus>("/api/export"),
  pillars: () => get<PillarsResp>("/api/pillars"),
  rubrics: () => get<RubricsResp>("/api/rubrics"),
  setPillar: (id: string, pillar: string) =>
    post<{ ok: boolean }>(`/api/reels/${id}/pillar`, { pillar }),
  setRubric: (id: string, rubric: string) =>
    post<{ ok: boolean }>(`/api/reels/${id}/rubric`, { rubric }),

  // Analyse du cours
  videos: () => get<{ videos: VideoItem[] }>("/api/videos"),
  timeline: (stem: string) => get<TimelineResp>(`/api/videos/${encodeURIComponent(stem)}/timeline`),
  quality: (stem: string) => get<TimelineResp>(`/api/videos/${encodeURIComponent(stem)}/quality`),
  decide: (stem: string, marker: string, decision: string) =>
    post<{ ok: boolean }>(`/api/videos/${encodeURIComponent(stem)}/timeline/decide`, { marker, decision }),

  // AI Director
  agentsCoach: () => get<CoachResp>("/api/agents/coach"),
  agentsPipeline: () => get<PipelineResp>("/api/agents/pipeline"),
  setAgentEnabled: (id: string, on: boolean) =>
    post<{ ok: boolean }>(`/api/agents/${id}/enable`, { on }),
};
