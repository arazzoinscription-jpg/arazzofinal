import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";
import { MembersManager, type Member } from "./members-manager";
import { GroupWhatsAppManager } from "./whatsapp-manager";
import { ArrowLeft, School } from "lucide-react";
import { OngletsGroupe, type CleOnglet } from "./onglets";
import { ReglagesInscription } from "./reglages-inscription";
import { bandeauDe } from "../carte-groupe";

export const metadata = { title: "Groupe — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurGroupPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const { data: group } = await supabase
    .from("groups").select("id, name, description, cover_image_url, creator_id, whatsapp_link, whatsapp_disabled").eq("id", params.id).single();
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

  const onglet = (Array.isArray(searchParams.onglet) ? searchParams.onglet[0] : searchParams.onglet) as CleOnglet | undefined;

  return (
    <div>
      <Link href="/formateur/groupes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"><ArrowLeft size={15} aria-hidden /> Tous les groupes</Link>

      {/* En-tête du groupe : qui, combien, et les accès directs. */}
      <section className="relative overflow-hidden rounded-3xl border border-cream-200 bg-white mb-5">
        <div className={`h-20 sm:h-24 bg-gradient-to-br ${bandeauDe(group.id)} relative`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {group.cover_image_url ? <img src={group.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
        </div>
        <div className="px-5 pb-5 -mt-8 flex flex-col sm:flex-row sm:items-end gap-4">
          <span className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center font-playfair text-3xl font-bold text-[#5B16F9] relative" aria-hidden>
            {(group.name?.trim()[0] ?? "G").toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{group.name}</h1>
            {group.description ? <p className="text-gray-500 font-dm text-sm mt-0.5">{group.description}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">👤 {members.length} membre{members.length > 1 ? "s" : ""}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">📝 {posts.length} publication{posts.length > 1 ? "s" : ""}</span>
              <span className={`rounded-full px-2.5 py-1 ${group.whatsapp_link && !group.whatsapp_disabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100"}`}>
                WhatsApp {group.whatsapp_link && !group.whatsapp_disabled ? "relié" : "non relié"}
              </span>
            </div>
          </div>
          <Link href={`/formateur/classe?groupe=${group.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B16F9] text-white text-sm px-4 py-2 font-semibold hover:bg-[#4a10d0]">
            <School size={16} aria-hidden /> Voir la classe du groupe
          </Link>
        </div>
      </section>

      <OngletsGroupe
        initial={onglet ?? "publications"}
        onglets={[
          { cle: "publications", titre: "Publications", compte: posts.length, contenu: me ? <div className="max-w-3xl"><Feed posts={posts} me={me} groupId={group.id} /></div> : null },
          { cle: "membres", titre: "Membres", compte: members.length, contenu: <div className="max-w-2xl"><MembersManager groupId={group.id} members={members} /></div> },
          { cle: "inscriptions", titre: "Inscriptions", contenu: <ReglagesInscription groupId={group.id} /> },
          { cle: "whatsapp", titre: "WhatsApp", contenu: <div className="max-w-2xl"><GroupWhatsAppManager groupId={group.id} initialLink={group.whatsapp_link ?? null} disabled={!!group.whatsapp_disabled} /></div> },
        ]}
      />
    </div>
  );
}
