import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { uuid: string } }
) {
  const supabase = await createClient();

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

  // UUID for verification
  doc.setFontSize(8);
  doc.text(`Réf : ${cert.uuid_public}`, W / 2, 185, { align: "center" });
  doc.text("arazzo.formation", W / 2, 192, { align: "center" });

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
