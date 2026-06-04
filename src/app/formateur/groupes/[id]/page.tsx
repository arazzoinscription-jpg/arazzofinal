import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";
import { MembersManager, type Member } from "./members-manager";

export const metadata = { title: "Groupe — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurGroupPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const { data: group } = await supabase
    .from("groups").select("id, name, description, cover_image_url, creator_id").eq("id", params.id).single();
  if (!group) notFound();
  if (group.creator_id !== user.id && !isAdmin) redirect("/formateur/groupes");

  // Membres (client admin : profils d'autres utilisateurs)
  const admin = createAdminClient();
  const { data: rawMembers } = await admin
    .from("group_members")
    .select("user_id, user:users(nom, email, avatar_url)")
    .eq("group_id", group.id)
    .order("joined_at", { ascending: true });
  const members: Member[] = (rawMembers ?? []).map((m: any) => ({
    user_id: m.user_id,
    nom: m.user?.nom ?? "Étudiant",
    email: m.user?.email ?? "",
    avatar_url: m.user?.avatar_url ?? null,
  }));

  // Feed du groupe
  const { me, posts } = await loadFeed(group.id);

  return (
    <div>
      <Link href="/formateur/groupes" className="text-sm text-orange-600 font-semibold hover:underline">← Mes groupes</Link>

      <div className="my-4 flex items-center gap-4">
        {group.cover_image_url && <img src={group.cover_image_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />}
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-gray-500 font-dm">{group.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Membres */}
        <div className="lg:col-span-1 lg:order-2">
          <MembersManager groupId={group.id} members={members} />
        </div>
        {/* Feed */}
        <div className="lg:col-span-2 lg:order-1">
          {me && <Feed posts={posts} me={me} groupId={group.id} />}
        </div>
      </div>
    </div>
  );
}
