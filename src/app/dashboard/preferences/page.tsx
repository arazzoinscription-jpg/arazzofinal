import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreferencesForm } from "./preferences-form";
import { DashHeader } from "../dash-header";

export const metadata = { title: "Préférences email — Arazzo Formation" };

const DEFAULTS = {
  welcome: true, purchases: true, new_content: true, teacher_reply: true,
  private_msg: true, certificates: true, reactivation: true, announcements: true,
};

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("welcome, purchases, new_content, teacher_reply, private_msg, certificates, reactivation, announcements")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <DashHeader index="11" eyebrow="Mon compte" title="Préférences email" subtitle="Choisissez les emails que vous souhaitez recevoir d'Arazzo Formation." />
      <PreferencesForm initial={{ ...DEFAULTS, ...(prefs ?? {}) }} />
    </div>
  );
}
