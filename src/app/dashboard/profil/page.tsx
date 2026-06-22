import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ACTION_LABELS } from "@/lib/activity";
import { DashHeader, ATELIER_CARD } from "../dash-header";

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

  const { data: activity } = await supabase
    .from("activity_log")
    .select("action, meta, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="max-w-2xl">
      <DashHeader index="09" eyebrow="Mon compte" title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre mot de passe." />

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

      {/* Activité récente */}
      <div className={`rounded-2xl p-6 mt-8 ${ATELIER_CARD}`}>
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-4">Mon activité récente</h2>
        {!activity?.length ? (
          <p className="text-gray-400 text-sm font-dm">Aucune activité enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((a, i) => {
              const m = ACTION_LABELS[a.action] ?? { icon: "•", label: a.action };
              const meta = a.meta as Record<string, unknown> | null;
              const detail = (meta?.lessonTitre || meta?.courseTitre || "") as string;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-cream-100 last:border-0">
                  <span className="text-lg flex-shrink-0">{m.icon}</span>
                  <span className="text-sm text-gray-700 font-dm flex-1 truncate">
                    {m.label}{detail ? ` · ${detail}` : ""}
                  </span>
                  <span className="text-xs text-gray-400 font-dm flex-shrink-0">
                    {new Date(a.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
