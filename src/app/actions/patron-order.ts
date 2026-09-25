"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { sendEmail } from "@/lib/email";

// Commande d'un patron existant sur la landing → déposée dans Supabase
// (`patron_order_leads`). Arazzo OS la rapatrie au clic « Synchroniser » (il crée
// la vraie commande + la preuve, l'école valide, l'accès « Mes patrons » s'ouvre).

const ADMIN = process.env.ARAZZO_ADMIN_EMAIL || "arazzoinscription@gmail.com";

const Schema = z.object({
  patron_id: z.string().trim().min(1),
  patron_title: z.string().trim().optional(),
  format: z.enum(["pdf", "a0", "placement"]).default("pdf"),
  first_name: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().min(4),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  sizes: z.array(z.string().trim()).optional(),
  placement: z.record(z.string(), z.string()).optional(),
  proof_url: z.string().url(),
  amount: z.number().optional(),
  method: z.string().trim().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export async function submitPatronOrder(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "validation_failed" };
  const d = parsed.data;

  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("patron_order_leads").insert({
      patron_id: d.patron_id,
      format: d.format,
      first_name: d.first_name,
      email: d.email,
      phone: d.phone,
      address: d.address || null,
      city: d.city || null,
      sizes: d.sizes ?? [],
      placement: d.placement ?? null,
      proof_url: d.proof_url,
      amount: d.amount ?? null,
      method: d.method || "transfer",
      lang: d.lang || null,
      utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
    });
    if (error) return { ok: false as const, error: "Envoi impossible." };
  } catch {
    return { ok: false as const, error: "Envoi impossible." };
  }

  // Alerte admin (best-effort).
  try {
    await sendEmail({
      to: ADMIN, category: "welcome", force: true,
      subject: `🧵 Commande patron — ${d.patron_title || d.patron_id}`,
      html: `<h2 style="font-family:Georgia,serif;color:#2A0880">🧵 Nouvelle commande de patron</h2>
        <p style="color:#4b5563">À importer dans Arazzo OS (Synchroniser). Format <b>${d.format}</b>.</p>
        <table style="border-collapse:collapse">
          <tr><td>Patron</td><td><b>${d.patron_title || d.patron_id}</b></td></tr>
          <tr><td>Nom</td><td>${d.first_name}</td></tr>
          <tr><td>WhatsApp</td><td>${d.phone}</td></tr>
          <tr><td>E-mail</td><td>${d.email}</td></tr>
        </table>`,
    });
  } catch { /* best-effort */ }

  return { ok: true as const };
}
