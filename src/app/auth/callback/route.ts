import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startProspectAndWelcome } from "@/lib/prospects";

export const dynamic = "force-dynamic";

/** Callback OAuth / magic link (flux PKCE : ?code=...). Échange le code contre une session. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/communaute";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Suivi prospect + bienvenue (idempotent : n'agit que sur un NOUVEL inscrit
      // postérieur à la borne de démarrage, et n'envoie la bienvenue qu'une fois).
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata ?? {};
          const nom =
            (meta.nom as string | undefined) ??
            (meta.full_name as string | undefined) ??
            (meta.name as string | undefined) ??
            null;
          await startProspectAndWelcome(createAdminClient(), user.id, { nom, email: user.email ?? null, source: "oauth" });
        }
      } catch { /* best-effort */ }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=lien_expire", origin));
}
