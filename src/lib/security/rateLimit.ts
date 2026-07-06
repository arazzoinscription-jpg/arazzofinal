import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting via Upstash Redis (compatible Edge/middleware).
 * ⚠️ DÉSACTIVÉ tant que UPSTASH_REDIS_REST_URL / _TOKEN ne sont pas définis :
 *    dans ce cas, checkRateLimit renvoie toujours { ok: true } (aucun blocage,
 *    l'app n'est pas cassée). Définissez ces deux variables pour l'activer.
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

function build(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix: "arazzo_rl", analytics: false });
}

export const limiters = {
  auth: build(5, "15 m"),      // routes d'auth : 5 / 15 min / IP
  api: build(30, "1 m"),       // API génériques : 30 / 1 min / IP
  payment: build(3, "1 h"),    // paiement / preuve : 3 / 1 h / IP
  upload: build(10, "1 h"),    // upload de fichiers : 10 / 1 h / IP
};

export type LimiterKey = keyof typeof limiters;

/** Extraction de l'IP cliente (ordre adapté à Vercel). */
export function getClientIp(headers: Headers): string {
  // `x-real-ip` est posé par la plateforme (Vercel) = valeur de confiance, non
  // falsifiable par le client, contrairement au premier segment de x-forwarded-for
  // que le client peut préfixer (SEC-012). On le privilégie donc.
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

/**
 * Vérifie la limite. Si Upstash n'est pas configuré → autorisé (no-op).
 * `failClosed` (SEC-009) : en cas d'indisponibilité de Redis, refuser plutôt
 * qu'autoriser — à activer pour les routes sensibles (auth, paiement).
 */
export async function checkRateLimit(
  key: LimiterKey,
  ip: string,
  failClosed = false,
): Promise<{ ok: boolean; remaining?: number }> {
  const limiter = limiters[key];
  if (!limiter) return { ok: true };
  try {
    const { success, remaining } = await limiter.limit(ip);
    return { ok: success, remaining };
  } catch {
    // Redis indisponible : fail-closed sur les routes sensibles, fail-open sinon.
    return { ok: !failClosed };
  }
}
