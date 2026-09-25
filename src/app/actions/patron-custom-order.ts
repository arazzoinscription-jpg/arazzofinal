"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { sendEmail } from "@/lib/email";

// Demande de patron SUR MESURE sur la landing → déposée dans Supabase
// (`patron_custom_order_leads`). Arazzo OS la rapatrie au clic « Synchroniser »
// (crée le compte LMS + dépose la demande dans le workflow sur-mesure du LMS).

const ADMIN = process.env.ARAZZO_ADMIN_EMAIL || "arazzoinscription@gmail.com";

const Schema = z.object({
  first_name: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().min(4),
  photo_url: z.string().url(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  patron_id: z.string().trim().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export async function submitCustomPatronOrder(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "validation_failed" };
  const d = parsed.data;

  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("patron_custom_order_leads").insert({
      first_name: d.first_name,
      email: d.email,
      phone: d.phone,
      photo_url: d.photo_url,
      message: d.message || null,
      patron_id: d.patron_id || null,
      lang: d.lang || null,
      utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
    });
    if (error) return { ok: false as const, error: "Envoi impossible." };
  } catch {
    return { ok: false as const, error: "Envoi impossible." };
  }

  try {
    await sendEmail({
      to: ADMIN, category: "welcome", force: true,
      subject: "✨ Demande de patron sur mesure",
      html: `<h2 style="font-family:Georgia,serif;color:#2A0880">✨ Nouvelle demande sur mesure</h2>
        <p style="color:#4b5563">À importer dans Arazzo OS (Synchroniser).</p>
        <table style="border-collapse:collapse">
          <tr><td>Nom</td><td><b>${d.first_name}</b></td></tr>
          <tr><td>WhatsApp</td><td>${d.phone}</td></tr>
          <tr><td>E-mail</td><td>${d.email}</td></tr>
        </table>
        <p><a href="${d.photo_url}">Voir la photo du modèle</a></p>`,
    });
  } catch { /* best-effort */ }

  return { ok: true as const };
}
