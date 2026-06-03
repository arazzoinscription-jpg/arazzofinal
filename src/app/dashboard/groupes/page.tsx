import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Mes groupes — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function StudentGroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Groupes dont l'étudiant est membre (client admin : la RLS users_read_own
  // empêche de lire le nom du créateur via le client utilisateur)
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("group_members")
    .select("group:groups(id, name, description, cover_image_url, creator:users(nom))")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const groups = (rows ?? [])
    .map((r: any) => r.group)
    .filter(Boolean) as { id: string; name: string; description: string | null; cover_image_url: string | null; creator: { nom?: string } | null }[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mes groupes</h1>
        <p className="text-gray-500 mt-1 font-dm">Les espaces privés auxquels vous participez.</p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-xl text-gray-400">Vous ne faites partie d'aucun groupe pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g) => (
            <Link key={g.id} href={`/dashboard/groupes/${g.id}`}
              className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-lg hover:border-violet-200 transition-all">
              <div className="h-28 bg-violet-100 flex items-center justify-center text-4xl overflow-hidden">
                {g.cover_image_url ? <img src={g.cover_image_url} alt="" className="w-full h-full object-cover" /> : "👥"}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 font-dm">{g.name}</h3>
                {g.description && <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-0.5">{g.description}</p>}
                <p className="text-xs text-gray-400 font-dm mt-2">Animé par {g.creator?.nom ?? "votre formatrice"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
