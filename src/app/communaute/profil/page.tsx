import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileEditForm } from "./profile-edit-form";

export const metadata = { title: "Éditer mon profil — Communauté" };
export const dynamic = "force-dynamic";

export default async function CommunityProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/communaute/profil");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users").select("nom, username, bio, avatar_url").eq("id", user.id).maybeSingle();

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <div className="max-w-md mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24">
        <Link href={`/communaute/u/${user.id}`} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Mon profil
        </Link>
        <h1 className="font-playfair text-2xl font-bold mb-6">Éditer mon profil</h1>
        <ProfileEditForm
          userId={user.id}
          initial={{
            nom: profile?.nom ?? "",
            username: profile?.username ?? "",
            bio: profile?.bio ?? "",
            avatar_url: profile?.avatar_url ?? "",
          }}
        />
      </div>
    </div>
  );
}
