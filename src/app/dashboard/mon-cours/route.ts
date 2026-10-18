import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coursEnCours } from "@/lib/cours-en-cours";

export const dynamic = "force-dynamic";

/**
 * « Mon cours » (menu, bouton « Voir ton cours ») : ouvre le cours en cours — le programme et la vidéo — sur la
 * dernière leçon ouverte (sinon la 1re leçon de sa formation). Sans formation : le catalogue des formations.
 */
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?redirect=/dashboard/mon-cours", origin));
  const cours = await coursEnCours(createAdminClient(), user.id);
  return NextResponse.redirect(new URL(cours ? `/dashboard/cours/${cours.lessonId}` : "/formations", origin));
}
