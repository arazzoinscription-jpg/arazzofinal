import Link from "next/link";
import { SlidersHorizontal, BellRing } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailPreferencesForm } from "./preferences-form";

export const metadata = { title: "Préférences — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPreferencesPage() {
  const admin = createAdminClient();

  // Lecture résiliente : colonne absente (migration 069 non appliquée) → tout activé.
  let initial: Record<string, boolean> = {};
  try {
    const { data, error } = await admin
      .from("platform_config").select("email_categories").eq("id", 1).maybeSingle();
    if (!error) initial = (data as { email_categories?: Record<string, boolean> } | null)?.email_categories ?? {};
  } catch { /* pré-migration */ }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <SlidersHorizontal size={26} className="text-orange-600" /> Préférences
      </h1>
      <p className="text-gray-500 mb-6 font-dm">
        Choisissez quels types d'emails la plateforme envoie. Une catégorie désactivée
        n'envoie plus AUCUN email (l'envoi est journalisé « ignoré » dans{" "}
        <Link href="/admin/emails" className="text-violet-700 underline">Emails</Link>).
      </p>

      <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900 font-dm flex items-start gap-2.5">
        <BellRing size={17} className="shrink-0 mt-0.5" />
        <span>
          Les relances pédagogiques (« On ne vous a pas vue depuis 7 jours 🌸 », « Envoyez votre
          travail pratique ✂️ »…) partent désormais en <strong>notification</strong> (cloche + push),
          plus par email.
        </span>
      </div>

      <EmailPreferencesForm initial={initial} />
    </div>
  );
}
