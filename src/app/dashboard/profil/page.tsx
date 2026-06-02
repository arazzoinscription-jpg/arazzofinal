import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Mon profil — Arazzo Formation" };

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("nom, email, ville, pays, avatar_url, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1 font-dm">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      <ProfileForm
        initial={{
          nom: profile?.nom ?? "",
          email: profile?.email ?? user.email ?? "",
          ville: profile?.ville ?? "",
          pays: profile?.pays ?? "DZ",
          avatar_url: profile?.avatar_url ?? "",
          role: profile?.role ?? "eleve",
        }}
      />
    </div>
  );
}
