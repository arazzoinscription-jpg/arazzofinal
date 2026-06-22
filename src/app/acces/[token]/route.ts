import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Lien d'accès branché Arazzo : /acces/<token>.
 * Valide le token maison (48h) puis génère un lien magique Supabase FRAIS et y
 * redirige → l'élève est connecté. Le token Supabase n'apparaît jamais dans le
 * lien partagé/imprimé (seul /acces/<token> circule).
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = (params.token ?? "").trim();
  const fail = (code: string) => NextResponse.redirect(`${SITE}/login?error=${code}`);
  if (!token) return fail("lien_invalide");

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("access_links").select("user_id, redirect_to, expires_at").eq("token", token).maybeSingle();
  if (!link) return fail("lien_invalide");
  if (new Date(link.expires_at).getTime() < Date.now()) return fail("lien_expire");

  const { data: u } = await admin.from("users").select("email").eq("id", link.user_id).maybeSingle();
  if (!u?.email) return fail("lien_invalide");

  const next = link.redirect_to || "/dashboard";
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: u.email,
    options: { redirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data?.properties?.action_link) return fail("acces");

  // Trace la dernière utilisation (le lien reste réutilisable jusqu'à expiration).
  await admin.from("access_links").update({ used_at: new Date().toISOString() }).eq("token", token);

  return NextResponse.redirect(data.properties.action_link);
}
