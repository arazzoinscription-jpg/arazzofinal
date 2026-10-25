import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coursEnCours } from "@/lib/cours-en-cours";
import { coursGratuitsDe } from "@/lib/visiteuses/annuaire-load";

export const dynamic = "force-dynamic";

/**
 * « Mon cours » (menu, bouton « Voir ton cours ») : ouvre le cours en cours — le programme et la vidéo — sur la
 * dernière leçon ouverte (sinon la 1re leçon de sa formation). Sans formation : son cours GRATUIT (Delivery Page dont
 * elle a rempli le formulaire) ; sans rien de tout cela : le catalogue des formations.
 */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?redirect=/dashboard/mon-cours", origin));
  const admin = createAdminClient();
  const cours = await coursEnCours(admin, user.id);
  if (cours) return NextResponse.redirect(new URL(`/dashboard/cours/${cours.lessonId}`, origin));
  const gratuit = (await coursGratuitsDe(admin, user.email).catch(() => [])).find((c) => c.enLigne);
  return NextResponse.redirect(new URL(gratuit ? gratuit.lien : "/formations", origin));
}
