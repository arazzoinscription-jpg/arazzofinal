import { createAdminClient } from "@/lib/supabase/admin";
import { getLiveByToken } from "@/lib/live";
import { LiveView } from "@/components/live/live-view";

export const metadata = { title: "Direct — Arazzo Formation" };
export const dynamic = "force-dynamic";

/**
 * Page de direct par LIEN PRIVÉ : accessible à toute personne possédant le lien
 * (audience 'link'), sans connexion ni appartenance à un groupe. Le jeton fait
 * office de contrôle d'accès.
 */
export default async function LiveTokenPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const live = await getLiveByToken(admin, params.token);
  return <LiveView live={live} backHref="/" />;
}
