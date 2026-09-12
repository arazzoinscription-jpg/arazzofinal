"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email";

// Capture d'un PROSPECT présentiel (formation/atelier à Sétif), 24/7, sans base
// dédiée : on notifie l'administratrice par e-mail et on confirme au prospect.
// Le présentiel se confirme ensuite par téléphone (WhatsApp).

const ADMIN = process.env.ARAZZO_ADMIN_EMAIL || "arazzoinscription@gmail.com";

const Schema = z.object({
  offer: z.string().trim().min(1),
  full_name: z.string().trim().min(2, "Votre nom est requis."),
  phone: z.string().trim().min(6, "Un numéro WhatsApp est requis."),
  email: z.string().email("E-mail invalide.").optional().or(z.literal("")),
  wilaya: z.string().trim().max(120).optional().or(z.literal("")),
  availabilities: z.array(z.string().trim().max(60)).max(20).optional(),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

function esc(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function submitPresentielLead(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const dispos = (d.availabilities ?? []).filter(Boolean).join(", ") || "—";

  const rows: [string, string][] = [
    ["Formation (présentiel)", d.offer],
    ["Nom", d.full_name],
    ["WhatsApp", d.phone],
    ["E-mail", d.email || "—"],
    ["Wilaya", d.wilaya || "—"],
    ["Disponibilités", dispos],
    ["Message", d.message || "—"],
  ];
  const trs = rows
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#6b6480;white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
  const adminHtml = `
    <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">🏫 Nouveau prospect présentiel</h2>
    <p style="color:#4b5563">Une personne souhaite s'inscrire en présentiel (à Sétif). Rappelez-la sur WhatsApp pour confirmer sa place et le créneau.</p>
    <table style="width:100%;border-collapse:collapse;background:#f6f3ff;border-radius:12px">${trs}</table>`;

  try {
    await sendEmail({
      to: ADMIN, category: "welcome", force: true,
      subject: `🏫 Prospect présentiel — ${d.offer}`, html: adminHtml,
    });
  } catch { /* l'e-mail admin ne doit pas bloquer le prospect */ }

  if (d.email) {
    const prospectHtml = `
      <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">C'est bien noté 🌸</h2>
      <p style="color:#4b5563">Bonjour ${esc(d.full_name)}, votre intérêt pour <b>${esc(d.offer)}</b> (présentiel, à Sétif) est enregistré.</p>
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
