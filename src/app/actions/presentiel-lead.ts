"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// Capture d'un PROSPECT présentiel (formation/atelier à Sétif), 24/7, sans
// tunnel. Le prospect est écrit dans Supabase (`presentiel_leads`) ; Arazzo OS
// le RAPATRIE ensuite dans son CRM au clic « Synchroniser » (le CRM présentiel
// vit dans l'OS). On notifie aussi l'administratrice par e-mail (best-effort).

const ADMIN = process.env.ARAZZO_ADMIN_EMAIL || "arazzoinscription@gmail.com";

const Schema = z.object({
  slug: z.string().trim().min(1),
  offer: z.string().trim().optional(),
  first_name: z.string().trim().min(2, "validation_failed"),
  phone: z.string().trim().min(6, "validation_failed"),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  availabilities: z.array(z.string().trim().max(60)).max(20).optional(),
  formula_id: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  consent: z.boolean().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

function esc(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function submitPresentielLead(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "validation_failed" };
  }
  const d = parsed.data;
  const offerName = d.offer || d.slug;

  // 1. Écrit le prospect dans Supabase (source de vérité en attendant la synchro OS).
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("presentiel_leads").insert({
      slug: d.slug,
      first_name: d.first_name,
      phone: d.phone,
      email: d.email || null,
      city: d.city || null,
      availabilities: d.availabilities ?? [],
      formula_id: d.formula_id || null,
      message: d.message || null,
      consent: Boolean(d.consent),
      lang: d.lang || null,
      source: d.utm?.utm_source || "landing",
      utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
    });
    if (error) return { ok: false as const, error: "Envoi impossible." };
  } catch {
    return { ok: false as const, error: "Envoi impossible." };
  }

  // 2. Alerte l'administratrice par e-mail (best-effort, jamais bloquant).
  const dispos = (d.availabilities ?? []).filter(Boolean).join(", ") || "—";
  const rows: [string, string][] = [
    ["Formation (présentiel)", offerName],
    ["Nom", d.first_name],
    ["WhatsApp", d.phone],
    ["E-mail", d.email || "—"],
    ["Ville", d.city || "—"],
    ["Disponibilités", dispos],
  ];
  const trs = rows
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#6b6480;white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
  const adminHtml = `
    <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">🏫 Nouveau prospect présentiel</h2>
    <p style="color:#4b5563">Un prospect a été enregistré sur le site. Il sera importé dans le CRM d'Arazzo OS à la prochaine synchronisation. Rappelez-le sur WhatsApp pour confirmer sa place et le créneau.</p>
    <table style="width:100%;border-collapse:collapse;background:#f6f3ff;border-radius:12px">${trs}</table>`;
  try {
    await sendEmail({
      to: ADMIN, category: "welcome", force: true,
      subject: `🏫 Prospect présentiel — ${offerName}`, html: adminHtml,
    });
  } catch { /* l'e-mail admin ne doit pas bloquer le prospect */ }

  // 3. Confirmation au prospect (best-effort) si une adresse est connue.
  if (d.email) {
    const prospectHtml = `
      <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">C'est bien noté 🌸</h2>
      <p style="color:#4b5563">Bonjour ${esc(d.first_name)}, votre intérêt pour <b>${esc(offerName)}</b> (présentiel, à Sétif) est enregistré.</p>
      <p style="color:#4b5563">Nous vous rappellerons sur <b>WhatsApp</b> pour confirmer votre place et le jour retenu. Ce n'est pas encore une inscription définitive.</p>
      <p style="color:#9ca3af;font-size:13px">Arazzo Formation — Sétif</p>`;
    try {
      await sendEmail({
        to: d.email, category: "welcome", force: true,
        subject: "Votre intérêt pour la formation présentielle Arazzo", html: prospectHtml,
      });
    } catch { /* best-effort */ }
  }

  return { ok: true as const };
}
