import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
  // Sur une page protégée : on « revendique » l'appareil à la 1ʳᵉ visite après
  // connexion (cookie arazzo_device = identifiant stocké dans users.active_session_id).
  // Si plus tard cet identifiant ne correspond plus (connexion depuis un autre
  // appareil), CET appareil est déconnecté. Fail-open : toute erreur (ou colonne
  // absente avant migration 048) laisse passer sans rien casser. Le staff
  // (admin/formateur) n'est jamais limité à un seul appareil.
  if (isProtected && user) {
    try {
      const { data: prof } = await supabase
        .from("users").select("role, active_session_id").eq("id", user.id).maybeSingle();
      if (prof?.role === "eleve") {
        const cookie = request.cookies.get("arazzo_device")?.value || null;
        const dbId = (prof as { active_session_id?: string | null }).active_session_id || null;

        if (!cookie) {
          // 1ʳᵉ page protégée après connexion sur cet appareil → il devient l'appareil autorisé.
          const newId = crypto.randomUUID();
          await supabase.from("users").update({ active_session_id: newId }).eq("id", user.id);
          supabaseResponse.cookies.set("arazzo_device", newId, {
            httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
            path: "/", maxAge: 60 * 60 * 24 * 365,
          });
        } else if (dbId && cookie !== dbId) {
          // Un autre appareil a pris la main → on déconnecte celui-ci (efface les cookies).
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("error", "autre_appareil");
          const res = NextResponse.redirect(url);
          for (const c of request.cookies.getAll()) {
            if (c.name.startsWith("sb-") || c.name === "arazzo_device") {
              res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
            }
          }
          return res;
        }
      }
    } catch {
      /* fail-open : ne jamais bloquer l'accès sur une erreur de ce contrôle */
    }
  }

  return supabaseResponse;
}
