import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveLiveForViewer } from "@/lib/live";
import { LiveView } from "@/components/live/live-view";

export const metadata = { title: "En direct — Communauté Arazzo" };
export const dynamic = "force-dynamic";

export default async function CommunityLivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/communaute/live");

  const admin = createAdminClient();
  const live = await getActiveLiveForViewer(admin, user.id);
  return <LiveView live={live} backHref="/communaute" />;
}
