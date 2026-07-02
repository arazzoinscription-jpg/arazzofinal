import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProspectSettings } from "@/lib/prospects";
import { ProspectSettingsForm } from "./settings-form";

export const metadata = { title: "Paramètres prospects — Admin" };
export const dynamic = "force-dynamic";

export default async function ProspectSettingsPage() {
  const admin = createAdminClient();
  const s = await getProspectSettings(admin);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl">
      <Link href="/admin/prospects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft size={15} /> Retour aux prospects
      </Link>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Paramètres de la séquence</h1>
      <p className="text-gray-500 mb-6 font-dm">
        Délais, sujets et contenus des emails automatiques — modifiables sans toucher au code.
        Laisser un sujet/contenu vide utilise le modèle par défaut. Variable disponible dans le contenu : <code>{"{{nom}}"}</code>.
      </p>
      <ProspectSettingsForm
        initial={{
          enabled: s.enabled,
          delay_welcome_days: s.delay_welcome_days,
          delay_reminder_2_days: s.delay_reminder_2_days,
          delay_reminder_7_days: s.delay_reminder_7_days,
          delay_reminder_14_days: s.delay_reminder_14_days,
          delay_deletion_months: s.delay_deletion_months,
          subject_welcome: s.subject_welcome, html_welcome: s.html_welcome,
          subject_reminder_2: s.subject_reminder_2, html_reminder_2: s.html_reminder_2,
          subject_reminder_7: s.subject_reminder_7, html_reminder_7: s.html_reminder_7,
          subject_reminder_14: s.subject_reminder_14, html_reminder_14: s.html_reminder_14,
          promo_enabled: s.promo_enabled, promo_text: s.promo_text,
          signature: s.signature, logo_url: s.logo_url,
        }}
      />
    </div>
  );
}
