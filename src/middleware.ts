import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit, getClientIp, type LimiterKey } from "@/lib/security/rateLimit";

const MUTATIONS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isWebhook = pathname.startsWith("/api/webhooks/");
  // Le traçage analytics (beacons de pages vues) ne doit pas être rate-limité.
  const isTrack = pathname.startsWith("/api/track");

  if (isApi && !isWebhook && !isTrack) {
    // ── CSRF (vérification d'Origin) pour les mutations ──
    // Une requête cross-site déclenchée par un navigateur envoie toujours l'en-tête Origin ;
    // s'il est présent et ne correspond pas à l'hôte → refus. (Origin absent = appel non-navigateur,
    // sans cookie auto → pas un vecteur CSRF, donc autorisé pour ne rien casser.)
    if (MUTATIONS.has(request.method)) {
      const origin = request.headers.get("origin");
      if (origin) {
        let originHost = "";
        try { originHost = new URL(origin).host; } catch { /* origin malformé */ }
        const host = request.headers.get("host");
        if (!originHost || originHost !== host) {
          return NextResponse.json({ error: "Requête refusée (origine non autorisée)." }, { status: 403 });
        }
      }
    }

    // ── Rate limiting (actif uniquement si UPSTASH_* configuré, sinon no-op) ──
    // La déconnexion n'est PAS un vecteur de brute-force → jamais rate-limitée
    // (sinon « Trop de tentatives » en boucle quand on se déconnecte plusieurs fois).
    const isSignout = pathname.startsWith("/api/auth/signout");
    if (!isSignout) {
      const ip = getClientIp(request.headers);
      let key: LimiterKey = "api";
      if (pathname.startsWith("/api/auth")) key = "auth";
      else if (/\/(payment|paiement|proof|preuve|enroll)/.test(pathname)) key = "payment";
      else if (/\/(upload|upsert)/.test(pathname)) key = "upload";
      // Fail-closed (SEC-009) sur l'auth et le paiement : si Redis tombe, on refuse
      // plutôt que de rouvrir la porte au brute-force / abus.
      const failClosed = key === "auth" || key === "payment";
      const { ok } = await checkRateLimit(key, ip, failClosed);
      if (!ok) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
