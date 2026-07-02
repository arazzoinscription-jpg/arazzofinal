import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";

export const metadata = { title: "Groupe — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function StudentGroupPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Contrôle d'accès : l'étudiant doit être membre du groupe
  const { data: membership } = await supabase
    .from("group_members").select("id").eq("group_id", params.id).eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/dashboard/groupes");

  const { data: group } = await supabase
    .from("groups").select("id, name, description, cover_image_url, whatsapp_link, whatsapp_disabled").eq("id", params.id).single();
  if (!group) notFound();

  // Bouton « Rejoindre le groupe WhatsApp » : seulement si un lien actif est configuré.
  const waLink = !group.whatsapp_disabled && group.whatsapp_link ? group.whatsapp_link : null;

  const { me, posts } = await loadFeed(group.id);

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/groupes" className="text-sm text-orange-600 font-semibold hover:underline">← Mes groupes</Link>

      <div className="my-4 flex items-center gap-4">
        {group.cover_image_url && <img src={group.cover_image_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />}
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-gray-500 font-dm">{group.description}</p>}
        </div>
      </div>

      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer"
          className="mb-5 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition-colors">
          <MessageCircle size={18} fill="currentColor" /> Rejoindre le groupe WhatsApp
        </a>
      )}

      {me && <Feed posts={posts} me={me} groupId={group.id} />}
    </div>
  );
}
