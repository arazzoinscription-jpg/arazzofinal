import { Mail, MessageCircle, MapPin } from "lucide-react";
import { LegalShell } from "@/components/legal/legal-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWaLink } from "@/lib/whatsapp";

export const metadata = {
  title: "Contact — Arazzo Formation",
  description: "Contactez l'équipe Arazzo Formation par e-mail ou WhatsApp.",
};

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = "info@formation-arazzo.store";

export default async function ContactPage() {
  // Numéro WhatsApp de l'administrateur (configuré dans Espace Admin › WhatsApp).
  let waLink: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_config")
      .select("whatsapp_admin_number")
      .eq("id", 1)
      .maybeSingle();
    waLink = buildWaLink(
      (data as { whatsapp_admin_number?: string } | null)?.whatsapp_admin_number,
      "Bonjour, j'ai une question à propos d'Arazzo Formation.",
    );
  } catch {
    /* config indisponible : on n'affiche pas le bouton WhatsApp */
  }

  return (
    <LegalShell title="Contactez-nous" subtitle="Nous sommes là pour vous aider">
      <p className="mb-8 text-gray-700 leading-relaxed font-dm">
        Une question sur une formation, votre compte, un paiement ou un diplôme&nbsp;?
        Notre équipe vous répond avec plaisir. Choisissez le moyen qui vous convient.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-start gap-4 bg-cream-50 hover:bg-cream-100 border border-cream-200 rounded-2xl p-5 transition-colors"
        >
          <span className="shrink-0 w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <Mail size={20} />
          </span>
          <span>
            <span className="block font-playfair font-bold text-gray-900">E-mail</span>
            <span className="block text-sm text-gray-600 font-dm break-all">{SUPPORT_EMAIL}</span>
            <span className="block text-xs text-gray-400 font-dm mt-1">Réponse sous 24–48&nbsp;h ouvrées</span>
          </span>
        </a>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 bg-cream-50 hover:bg-cream-100 border border-cream-200 rounded-2xl p-5 transition-colors"
          >
            <span className="shrink-0 w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <MessageCircle size={20} />
            </span>
            <span>
              <span className="block font-playfair font-bold text-gray-900">WhatsApp</span>
              <span className="block text-sm text-gray-600 font-dm">Discutez avec notre équipe</span>
              <span className="block text-xs text-gray-400 font-dm mt-1">Le plus rapide</span>
            </span>
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 font-dm">
        <MapPin size={16} className="text-orange-DEFAULT" /> Algérie — Alger, Oran, Constantine, Annaba
      </div>
    </LegalShell>
  );
}
