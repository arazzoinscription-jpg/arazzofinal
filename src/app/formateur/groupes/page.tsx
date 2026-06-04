import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupCreateForm } from "./group-create-form";
import { DeleteGroupButton } from "./delete-group-button";

export const metadata = { title: "Mes groupes — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurGroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Groupes créés par ce formateur + nombre de membres
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, cover_image_url, created_at, group_members(id)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mes groupes</h1>
        <p className="text-gray-500 mt-1 font-dm">Créez des espaces privés pour vos promotions ou ateliers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="lg:col-span-1">
          <GroupCreateForm />
        </div>

        {/* Liste */}
        <div className="lg:col-span-2 space-y-4">
          {!groups?.length ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-cream-200">
              <div className="text-5xl mb-3">👥</div>
              <p className="text-gray-400 font-dm">Aucun groupe pour le moment.</p>
            </div>
          ) : groups.map((g) => {
            const members = (g.group_members as any[])?.length ?? 0;
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
                {g.cover_image_url && (
                  <img src={g.cover_image_url} alt="" className="w-full h-28 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 font-dm">{g.name}</h3>
                      {g.description && <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-0.5">{g.description}</p>}
                      <p className="text-xs text-gray-400 font-dm mt-1">👤 {members} membre(s)</p>
                    </div>
                    <DeleteGroupButton id={g.id} />
                  </div>
                  <Link href={`/formateur/groupes/${g.id}`}
                    className="inline-block mt-3 bg-orange-DEFAULT text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                    Gérer & publier →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
