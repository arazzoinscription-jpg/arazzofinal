import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoles } from "@/lib/roles";
import { espaceAccueil } from "@/lib/espace-accueil";

export const dynamic = "force-dynamic";

/**
 * « Mon espace » : ouvre le BON espace selon le compte (formatrice → espace formateur, patronniste → espace
 * patronniste, élève → espace élève). « ?depuis=connexion » : juste après la connexion (élève → le feed).
 * Non connectée → page de connexion.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const depuis = searchParams.get("depuis") === "connexion" ? "connexion" : "lien";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?redirect=/mon-espace", origin));
  const { data } = await createAdminClient().from("users").select("role, roles").eq("id", user.id).maybeSingle();
  return NextResponse.redirect(new URL(espaceAccueil(getRoles(data), depuis), origin));
}
