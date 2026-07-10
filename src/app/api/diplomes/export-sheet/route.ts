import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function cell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/**
 * Feuille de livraison (CSV) des DIPLÔMES prêts à expédier (CNI reçue), à importer
 * dans le système de la société de livraison. Réservé à l'admin.
 * Colonnes : Nom, Prénom, Téléphone, Wilaya, Adresse, Formation, N° diplôme, Statut.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("diplomas")
    .select("full_name, phone, wilaya, address, numero, status, user:users(nom, ville, pays), course:courses(titre_fr)")
    .in("status", ["cni_uploaded", "generated"])
    .order("updated_at", { ascending: false });

  const header = ["Nom", "Prénom", "Téléphone", "Wilaya", "Adresse exacte", "Formation", "N° diplôme", "Statut"];
  const lines = [header.map(cell).join(";")];
  for (const d of (rows ?? []) as any[]) {
    const full = String(d.full_name ?? d.user?.nom ?? "").trim();
    const parts = full.split(/\s+/);
    const prenom = parts.length > 1 ? parts[0] : "";
    const nom = parts.length > 1 ? parts.slice(1).join(" ") : full;
    lines.push([
      nom, prenom, d.phone ?? "", d.wilaya ?? d.user?.ville ?? "", d.address ?? "",
      d.course?.titre_fr ?? "", d.numero ?? "", d.status ?? "",
    ].map(cell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM UTF-8 pour Excel

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="diplomes-livraison.csv"`,
    },
  });
}
