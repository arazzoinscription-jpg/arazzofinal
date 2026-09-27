"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { sendEmail } from "@/lib/email";
import { deliveryCourseEmail } from "@/lib/delivery-email";

// Capture d'un PROSPECT sur une Delivery Page (cours gratuit), 24/7, sans
// tunnel. Le prospect est DÉPOSÉ dans Supabase (`delivery_page_leads`, clé anon,
// INSERT seul — migration 088) ; Arazzo OS le RAPATRIE ensuite dans son CRM au
// clic « Synchroniser » (dédupliqué côté OS). Aucune lecture des prospects déjà
// déposés n'est possible depuis ici.

const Schema = z.object({
  slug: z.string().trim().min(1).max(160),
  full_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  wilaya: z.string().trim().max(80).optional().or(z.literal("")),
  consent: z.boolean().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});

export async function submitDeliveryLead(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "validation_failed" };
  const d = parsed.data;

  const supabase = createPublicClient();

  // La page doit exister ET être publiée : on relit l'instantané (public) pour
  // ne jamais accepter un dépôt sur une page fermée ou inventée.
  const { data: row } = await supabase
    .from("delivery_page_snapshots")
    .select("data")
    .eq("slug", d.slug)
    .maybeSingle();
  const page = (row?.data ?? null) as Record<string, any> | null;
  if (!page || page.active !== true) return { ok: false as const, error: "closed" };

  const form = (page.capture_form ?? {}) as Record<string, any>;
  if (!d.email && !d.phone) return { ok: false as const, error: "contact_required" };
  if (form.require_consent && !d.consent) return { ok: false as const, error: "consent_required" };

  try {
    const { error } = await supabase.from("delivery_page_leads").insert({
      slug: d.slug,
      full_name: d.full_name || null,
      phone: d.phone || null,
      email: d.email ? d.email.toLowerCase() : null,
      wilaya: d.wilaya || null,
      consent: Boolean(d.consent),
      lang: d.lang || null,
      // La source suit le lien partagé (utm_source) ; à défaut, celle de la page.
      source: d.utm?.utm_source || page.source || "delivery-page",
      utm: d.utm && Object.keys(d.utm).length
        ? d.utm
        : (page.campaign ? { utm_campaign: String(page.campaign) } : null),
    });
    if (error) return { ok: false as const, error: "send_failed" };
  } catch {
    return { ok: false as const, error: "send_failed" };
  }

  // E-mail automatique : lien du cours + proposition de formation (réglable par
  // page dans l'OS, activé par défaut). Best-effort : un e-mail qui échoue ne
  // fait jamais échouer l'inscription — le prospect est déjà enregistré, et
  // l'échec est tracé dans `email_log` par `sendEmail`.
  if (d.email && form.send_email !== false) {
    try {
      const { subject, html } = deliveryCourseEmail({
        page, slug: d.slug, name: d.full_name, lang: d.lang ?? null,
      });
      // `force` : c'est la LIVRAISON de ce que la personne vient de demander,
      // pas un envoi marketing soumis aux préférences d'un compte.
      await sendEmail({ to: d.email.toLowerCase(), category: "prospect", subject, html, force: true });
    } catch { /* best-effort */ }
  }

  return { ok: true as const };
}
