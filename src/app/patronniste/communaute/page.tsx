import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityPublisher } from "@/components/community/community-publisher";

export const metadata = { title: "Communauté — Patronniste" };
export const dynamic = "force-dynamic";

export default async function PatronnisteCommunautePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  let q = admin.from("patrons").select("id, titre").order("created_at", { ascending: false });
  if (!isAdmin) q = q.eq("formateur_id", user.id);
  const { data: patrons } = await q;

  return (
    <div className="max-w-2xl text-gray-900 dark:text-white">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="font-playfair text-2xl font-bold">Communauté</h1>
        <Link href="/communaute" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
          Voir le feed <ArrowUpRight size={15} />
        </Link>
      </div>
      <p className="text-sm text-gray-500 dark:text-white/50 mb-6 font-dm">
        Publiez une courte vidéo démo (max 3 min) d'un de vos patrons sur le feed communauté. Un bouton « Acheter le patron » est ajouté automatiquement.
      </p>
      <CommunityPublisher sourceType="patron_demo" kind="patron"
        items={(patrons ?? []).map((p) => ({ id: p.id, label: p.titre }))} />
    </div>
  );
}
