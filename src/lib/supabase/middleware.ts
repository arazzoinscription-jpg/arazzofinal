import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Session persistante « à la Instagram » : cookies conservés 400 jours (max navigateur).
      cookieOptions: { maxAge: 60 * 60 * 24 * 400 },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = ["/dashboard", "/formateur", "/admin"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Une seule session active par compte ÉLÈVE (anti-partage de compte) ──────
  // ── Session PERSISTANTE multi-appareils (comme Instagram / TikTok) ──────────
  // L'ancienne restriction « un seul appareil par compte » (migration 048)
  // déconnectait l'élève dès qu'il se connectait ailleurs, ou dès que le cookie
  // d'appareil était perdu → déconnexions à répétition. Elle est RETIRÉE :
  // l'utilisateur reste connecté sur tous ses appareils jusqu'à une déconnexion
  // MANUELLE. La session est rafraîchie ci-dessus par @supabase/ssr à chaque
  // requête (cookies sb-* renouvelés), donc elle ne s'expire pas d'elle-même.

  return supabaseResponse;
}
