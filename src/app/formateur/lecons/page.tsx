import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";
import { aplatirLecons, miniatureDe, type CoursBrut } from "@/lib/lecons/bibliotheque";
import { BibliothequeLecons } from "./bibliotheque-lecons";

export const metadata = { title: "Les leçons — Formateur" };
export const dynamic = "force-dynamic";

/**
 * « Les leçons » : toutes les leçons des cours (avec leur vidéo) en une liste ; on coche celles qu'on veut et on
 * crée un nouveau cours avec. Mêmes cours que « Mes cours » (les siens + les cours importés) ; l'admin voit tout.
 */
export default async function LeconsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();

  let requete = createAdminClient()
    .from("courses")
    .select("id, titre_fr, published, ordre, chapters(id, titre, ordre, lessons(id, titre, video_url_bunny, duree_minutes, ordre))");
  if (!isAdmin(prof)) requete = requete.or(`formateur_id.eq.${user.id},formateur_id.is.null`);
  const { data: cours } = await requete;

  const bibliotheque = process.env.BUNNY_LIBRARY_ID ?? "";
  const pullZone = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE ?? "";
  const lecons = aplatirLecons((cours ?? []) as CoursBrut[], (video) => miniatureDe(video, bibliotheque, pullZone));

  return <BibliothequeLecons lecons={lecons} />;
}
