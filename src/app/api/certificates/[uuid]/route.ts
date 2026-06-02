import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: { uuid: string } }
) {
  // Accès public (QR scanné par un employeur/vérificateur, sans connexion)
  const supabase = createAdminClient();

  const { data: cert } = await supabase
    .from("certificates")
    .select(`
      *,
      user:users(nom, ville, pays),
      course:courses(titre_fr)
    `)
    .eq("uuid_public", params.uuid)
    .single();

  if (!cert) {
    return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  }

  const user = cert.user as any;
  const course = cert.course as any;
  const issuedDate = new Date(cert.issued_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate PDF certificate
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const W = 297;
  const H = 210;

  // Background cream
  doc.setFillColor(245, 240, 235);
  doc.rect(0, 0, W, H, "F");

  // Violet border
  doc.setDrawColor(75, 59, 199);
  doc.setLineWidth(4);
  doc.rect(10, 10, W - 20, H - 20, "D");
  doc.setLineWidth(1);
  doc.rect(14, 14, W - 28, H - 28, "D");

  // Header
  doc.setFillColor(75, 59, 199);
  doc.rect(0, 0, W, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("times", "bold");
  doc.text("✂ ARAZZO", W / 2, 20, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("times", "italic");
  doc.text("Formation", W / 2, 32, { align: "center" });

  // Certificate title
  doc.setTextColor(75, 59, 199);
  doc.setFontSize(22);
  doc.setFont("times", "normal");
  doc.text("CERTIFICAT DE RÉUSSITE", W / 2, 65, { align: "center" });

  // Divider
  doc.setDrawColor(224, 120, 64);
  doc.setLineWidth(1.5);
  doc.line(60, 70, W - 60, 70);

  // Body text
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont("times", "normal");
  doc.text("Ce certificat est décerné à", W / 2, 90, { align: "center" });

  doc.setFontSize(26);
  doc.setFont("times", "bold");
  doc.setTextColor(75, 59, 199);
  doc.text(user.nom, W / 2, 108, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("times", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("pour avoir complété avec succès la formation :", W / 2, 122, { align: "center" });

  doc.setFontSize(18);
  doc.setFont("times", "bold");
  doc.setTextColor(224, 120, 64);
  doc.text(course.titre_fr, W / 2, 138, { align: "center" });

  // Date
  doc.setFontSize(11);
  doc.setFont("times", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Délivré le ${issuedDate}`, W / 2, 158, { align: "center" });

  // QR code de vérification (bas droite)
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://arazzo-bice.vercel.app";
  const verifyUrl = cert.qr_url || `${site}/certificat/${cert.uuid_public}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
    doc.addImage(qrDataUrl, "PNG", W - 48, 158, 30, 30);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Vérifier l'authenticité", W - 33, 191, { align: "center" });
  } catch { /* QR optionnel */ }

  // Numéro + référence (bas gauche)
  const numero = cert.numero || cert.uuid_public.slice(0, 8).toUpperCase();
  doc.setFontSize(9);
  doc.setFont("times", "bold");
  doc.setTextColor(75, 59, 199);
  doc.text(`N° ${numero}`, 24, 180);
  doc.setFontSize(7);
  doc.setFont("times", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Réf : ${cert.uuid_public}`, 24, 186);
  doc.text("arazzo.formation", 24, 191);

  // Orange bottom bar
  doc.setFillColor(224, 120, 64);
  doc.rect(0, H - 10, W, 10, "F");

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificat-arazzo-${params.uuid}.pdf"`,
    },
  });
}
