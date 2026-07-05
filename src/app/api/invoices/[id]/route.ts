import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFormateur } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import jsPDF from "jspdf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("id, amount, currency, paid_at, user_id, user:users(nom, email, ville, pays), course:courses(titre_fr)")
    .eq("id", params.id).single();
  if (!enr) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Accès : propriétaire ou staff
  const { data: prof } = await admin.from("users").select("role, roles").eq("id", user.id).single();
  const isStaff = isFormateur(prof);
  if (enr.user_id !== user.id && !isStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const u = enr.user as any;
  const course = enr.course as any;
  const num = "REC-" + new Date(enr.paid_at).getFullYear() + "-" + enr.id.slice(0, 6).toUpperCase();
  const date = new Date(enr.paid_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const montant = enr.currency === "EUR" ? `${Number(enr.amount).toFixed(2)} €` : `${Number(enr.amount).toLocaleString("fr-DZ")} DA`;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;

  // En-tête
  doc.setFillColor(75, 59, 199); doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(22);
  doc.text("ARAZZO Formation", 20, 20);
  doc.setFontSize(11); doc.setFont("times", "normal"); doc.text("Reçu de paiement", 20, 28);

  // Numéro + date
  doc.setTextColor(60, 60, 60); doc.setFontSize(11);
  doc.text(`Reçu N° : ${num}`, 20, 50);
  doc.text(`Date : ${date}`, 20, 57);

  // Client
  doc.setFont("times", "bold"); doc.text("Facturé à :", 20, 72);
  doc.setFont("times", "normal");
  doc.text(u?.nom ?? "—", 20, 79);
  if (u?.email) doc.text(u.email, 20, 85);
  if (u?.ville) doc.text(`${u.ville}${u.pays ? ", " + u.pays : ""}`, 20, 91);

  // Tableau article
  doc.setFillColor(245, 240, 235); doc.rect(20, 105, 170, 10, "F");
  doc.setFont("times", "bold"); doc.setFontSize(11);
  doc.text("Description", 24, 112); doc.text("Montant", 165, 112);
  doc.setFont("times", "normal");
  doc.text(`Formation : ${(course?.titre_fr ?? "").slice(0, 60)}`, 24, 125);
  doc.text(montant, 165, 125);

  // Total
  doc.setDrawColor(200, 200, 200); doc.line(20, 135, 190, 135);
  doc.setFont("times", "bold"); doc.setFontSize(13);
  doc.setTextColor(224, 120, 64);
  doc.text("TOTAL PAYÉ", 24, 145); doc.text(montant, 165, 145);

  // Pied
  doc.setTextColor(150, 150, 150); doc.setFont("times", "normal"); doc.setFontSize(9);
  doc.text("Merci pour votre confiance. Ce reçu atteste de votre accès à vie à la formation.", 20, 270);
  doc.text("arazzo.formation", 20, 276);
  doc.setFillColor(224, 120, 64); doc.rect(0, 287, W, 10, "F");

  const pdf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="recu-arazzo-${num}.pdf"` },
  });
}
