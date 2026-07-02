import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppConfigForm } from "./config-form";
import { WhatsAppGroupsManager, type AdminGroupRow } from "./groups-manager";

export const metadata = { title: "WhatsApp — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const admin = createAdminClient();

  const { data: cfg } = await admin
    .from("platform_config")
    .select("whatsapp_admin_number, whatsapp_default_message, whatsapp_bubble_enabled")
    .eq("id", 1)
    .maybeSingle();

  const { data: groups } = await admin
    .from("groups")
    .select("id, name, whatsapp_link, whatsapp_disabled, creator:users(nom)")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows: AdminGroupRow[] = (groups ?? []).map((g: any) => ({
    id: g.id,
    name: g.name ?? "Groupe",
    creatorName: (Array.isArray(g.creator) ? g.creator[0]?.nom : g.creator?.nom) ?? "Formateur",
    whatsapp_link: g.whatsapp_link ?? null,
    whatsapp_disabled: !!g.whatsapp_disabled,
  }));

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">WhatsApp</h1>
      <p className="text-gray-500 mb-6 font-dm">Bulle de contact + liens des groupes WhatsApp des formations.</p>

      <h2 className="font-dm font-semibold text-gray-800 mb-3">Configuration de la bulle</h2>
      <WhatsAppConfigForm
        initial={{
          whatsapp_admin_number: cfg?.whatsapp_admin_number ?? null,
          whatsapp_default_message: cfg?.whatsapp_default_message ?? null,
          whatsapp_bubble_enabled: cfg?.whatsapp_bubble_enabled ?? true,
        }}
      />

      <h2 className="font-dm font-semibold text-gray-800 mt-10 mb-3">Groupes WhatsApp des formations <span className="text-gray-400 font-normal">({rows.length})</span></h2>
      <WhatsAppGroupsManager rows={rows} />
    </div>
  );
}
