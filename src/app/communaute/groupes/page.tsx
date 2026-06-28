import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityFab } from "@/components/community/community-fab";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { CommunityHeader } from "../community-header";

export const metadata = { title: "Groupes — Communauté Arazzo" };
export const dynamic = "force-dynamic";

/** Groupes DANS l'environnement communauté (même en-tête + menu que le feed). */
export default async function CommunauteGroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  const role = prof?.role ?? "eleve";
  const { data: rows } = await admin
    .from("group_members")
    .select("group:groups(id, name, description, cover_image_url, creator:users(nom))")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const groups = (rows ?? [])
    .map((r: any) => r.group)
    .filter(Boolean) as { id: string; name: string; description: string | null; cover_image_url: string | null; creator: { nom?: string } | null }[];

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <CommunityHeader />
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-28">
        <h1 className="font-playfair text-2xl font-bold mb-1">Groups</h1>
        <p className="text-white/50 font-dm text-sm mb-5">Les espaces privés auxquels vous participez.</p>

        {groups.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-white/60 font-dm">Vous ne faites partie d'aucun groupe pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link key={g.id} href={`/dashboard/groupes/${g.id}`}
                className="bg-white/[0.05] rounded-2xl border border-white/10 overflow-hidden hover:border-orange-300/50 transition-all">
                <div className="h-28 bg-white/10 flex items-center justify-center text-4xl overflow-hidden">
                  {g.cover_image_url ? <img src={g.cover_image_url} alt="" className="w-full h-full object-cover" /> : "👥"}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white font-dm">{g.name}</h3>
                  {g.description && <p className="text-sm text-white/55 font-dm line-clamp-2 mt-0.5">{g.description}</p>}
                  <p className="text-xs text-white/40 font-dm mt-2">Animé par {g.creator?.nom ?? "votre formatrice"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {role !== "eleve" && <CommunityFab role={role} />}
      <MobileQuickNav />
    </div>
  );
}
