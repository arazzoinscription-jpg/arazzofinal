"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadDiploma, isDiplomasConfigured } from "@/lib/bunny/diplomas-storage";
import { sendEmail } from "@/lib/email";
import { isFormateur } from "@/lib/roles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) return { ok: false as const, error: "Accès refusé." };
  return { ok: true as const, admin: createAdminClient() };
}

/** Génère le diplôme PDF (après vérification CNI), le stocke sur Bunny, prévient l'élève. */
export async function generateDiploma(diplomaId: string) {
  if (!z.string().uuid().safeParse(diplomaId).success) return { ok: false, error: "Identifiant invalide." };
  if (!isDiplomasConfigured()) return { ok: false, error: "Stockage Bunny « diplômes » non configuré." };

  const g = await requireStaff();
  if (!g.ok) return { ok: false, error: g.error };
  const { admin } = g;

  const { data: dip } = await admin
    .from("diplomas")
    .select("id, user_id, course_id, full_name, numero, user:users(nom, email), course:courses(titre_fr)")
    .eq("id", diplomaId).maybeSingle();
  if (!dip) return { ok: false, error: "Diplôme introuvable." };

  const nom = dip.full_name || (dip.user as { nom?: string } | null)?.nom || "Élève";
  const courseTitre = (dip.course as { titre_fr?: string } | null)?.titre_fr ?? "Formation";
  const email = (dip.user as { email?: string } | null)?.email ?? null;
  const numero = dip.numero || `ARZ-${dip.id.slice(0, 8).toUpperCase()}`;
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // ── PDF (paysage A4) ──
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;
  doc.setFillColor(245, 240, 235); doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(75, 59, 199); doc.setLineWidth(4); doc.rect(10, 10, W - 20, H - 20, "D");
  doc.setLineWidth(1); doc.rect(14, 14, W - 28, H - 28, "D");
  doc.setFillColor(75, 59, 199); doc.rect(0, 0, W, 40, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.setFont("times", "bold");
  doc.text("✂ ARAZZO", W / 2, 20, { align: "center" });
  doc.setFontSize(14); doc.setFont("times", "italic"); doc.text("Formation", W / 2, 32, { align: "center" });
  doc.setTextColor(75, 59, 199); doc.setFontSize(24); doc.setFont("times", "normal");
  doc.text("DIPLÔME DE COUTURE", W / 2, 65, { align: "center" });
  doc.setDrawColor(224, 120, 64); doc.setLineWidth(1.5); doc.line(60, 70, W - 60, 70);
  doc.setTextColor(50, 50, 50); doc.setFontSize(14); doc.setFont("times", "normal");
  doc.text("Ce diplôme est décerné à", W / 2, 90, { align: "center" });
  doc.setFontSize(26); doc.setFont("times", "bold"); doc.setTextColor(75, 59, 199);
  doc.text(nom, W / 2, 108, { align: "center" });
  doc.setFontSize(13); doc.setFont("times", "normal"); doc.setTextColor(50, 50, 50);
  doc.text("pour avoir accompli avec succès la formation :", W / 2, 122, { align: "center" });
  doc.setFontSize(18); doc.setFont("times", "bold"); doc.setTextColor(224, 120, 64);
  doc.text(courseTitre, W / 2, 138, { align: "center" });
  doc.setFontSize(11); doc.setFont("times", "normal"); doc.setTextColor(100, 100, 100);
  doc.text(`Délivré le ${date}`, W / 2, 158, { align: "center" });
  doc.setFontSize(9); doc.setFont("times", "bold"); doc.setTextColor(75, 59, 199);
  doc.text(`N° ${numero}`, 24, 180);
  doc.setFontSize(7); doc.setFont("times", "normal"); doc.setTextColor(120, 120, 120);
  doc.text("Diplôme officiel — cachet humide apposé à l'expédition", 24, 186);
  doc.text("arazzo.formation", 24, 191);
  doc.setFillColor(224, 120, 64); doc.rect(0, H - 10, W, 10, "F");

  const pdf = doc.output("arraybuffer") as ArrayBuffer;

  let url: string;
  try {
    url = await uploadDiploma(pdf, `${dip.course_id}/${dip.user_id}/${numero}.pdf`);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await admin.from("diplomas").update({ status: "generated", diploma_url: url, numero, updated_at: new Date().toISOString() }).eq("id", diplomaId);

  try {
    await admin.from("notifications").insert({
      user_id: dip.user_id, type: "system", title: "🎓 Votre diplôme est prêt !",
      body: `Votre diplôme de « ${courseTitre} » a été généré. Il vous sera expédié sous environ une semaine.`, link: "/dashboard/diplome",
    });
  } catch { /* ignore */ }

  if (email) {
    const html = `
      <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
            <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
          </div>
          <div style="padding:34px;color:#444;line-height:1.7;font-size:15px;">
            <h2 style="color:#4B3BC7;font-family:Georgia,serif;">Félicitations ${nom.split(" ")[0]} 🎓</h2>
            <p>Votre <strong>diplôme officiel</strong> de « ${courseTitre} » a été généré (N° ${numero}). Il sera <strong>expédié physiquement</strong> (avec cachet humide) sous environ une semaine.</p>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>`;
    await sendEmail({ userId: dip.user_id, to: email, category: "welcome", force: true, subject: "🎓 Votre diplôme Arazzo est prêt", html });
  }

  revalidatePath("/formateur/diplomes");
  return { ok: true };
}

/** Marque un diplôme comme expédié. */
export async function markDiplomaShipped(diplomaId: string) {
  if (!z.string().uuid().safeParse(diplomaId).success) return { ok: false, error: "Identifiant invalide." };
  const g = await requireStaff();
  if (!g.ok) return { ok: false, error: g.error };
  const { error } = await g.admin.from("diplomas").update({ status: "shipped", updated_at: new Date().toISOString() }).eq("id", diplomaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/diplomes");
  return { ok: true };
}
