import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";
import { chargerLecons } from "@/lib/lecons/charger";
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

  return <BibliothequeLecons lecons={await chargerLecons(createAdminClient(), user.id, isAdmin(prof))} />;
}
