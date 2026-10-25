import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const court = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

/**
 * Écran « Une erreur s'est produite » : le navigateur envoie ici ce qui a planté (message, page, appareil, page
 * traduite ou non). Visible dans les journaux Vercel et, pour une personne connectée, dans Admin → Journal
 * d'activité (« Erreur d'affichage ») — pour savoir QUI est touchée et POURQUOI sans devoir lui demander.
 * Best-effort : ne renvoie jamais d'erreur.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const rapport = {
    message: court(body.message, 300),
    digest: court(body.digest, 64),
    pile: court(body.pile, 600),
    page: court(body.page, 300),
    traduite: court(body.traduite, 20),
    appareil: court(req.headers.get("user-agent"), 300),
  };

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  } catch { /* pas de session : seulement les journaux Vercel */ }

  console.error("[client-error]", JSON.stringify({ userId, ...rapport }));
  if (userId) await logActivity(userId, "client_error", rapport);
  return NextResponse.json({ ok: true });
}
