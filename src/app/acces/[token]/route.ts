import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandedSiteUrl } from "@/lib/site-url";

const SITE = brandedSiteUrl();

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
    .from("access_links").select("user_id, redirect_to, expires_at, used_at, single_use").eq("token", token).maybeSingle();
  if (!link) return fail("lien_invalide");
  if (new Date(link.expires_at).getTime() < Date.now()) return fail("lien_expire");
  // Lien à usage unique déjà consommé → refus (ex. réinitialisation de mot de passe).
  if (link.single_use && link.used_at) return fail("lien_deja_utilise");

  // Email depuis le profil applicatif ; à défaut, depuis auth.users (source de
  // vérité). Évite un « lien invalide » quand le profil public.users manque.
  let email: string | null = null;
  const { data: u } = await admin.from("users").select("email").eq("id", link.user_id).maybeSingle();
  email = u?.email ?? null;
  if (!email) {
    const { data: au } = await admin.auth.admin.getUserById(link.user_id);
    email = au?.user?.email ?? null;
  }
  if (!email) return fail("lien_invalide");

  const next = link.redirect_to || "/dashboard";
  // IMPORTANT : rediriger vers /auth/entrer (page CLIENT) et NON /auth/callback
  // (route serveur). Le lien magique délivre la session dans le FRAGMENT d'URL
  // (#access_token=…), que seul du code client peut lire — une route serveur n'y
  // a pas accès et renverrait l'élève vers /login.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE}/auth/entrer?next=${encodeURIComponent(next)}` },
  });
  if (error || !data?.properties?.action_link) return fail("acces");

  // Trace la dernière utilisation (le lien reste réutilisable jusqu'à expiration).
  await admin.from("access_links").update({ used_at: new Date().toISOString() }).eq("token", token);

  return NextResponse.redirect(data.properties.action_link);
}
