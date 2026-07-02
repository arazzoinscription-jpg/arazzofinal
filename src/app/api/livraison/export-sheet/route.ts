import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Échappe une valeur pour un CSV séparé par « ; » (compatible Excel FR). */
function cell(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

/**
 * Feuille de livraison (CSV) des commandes sélectionnées — à importer dans le
 * système de la société de livraison. Colonnes : nom, prénom, téléphone, wilaya,
 * adresse exacte, commande, produit, montant.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ error: "Aucune commande sélectionnée." }, { status: 400 });

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, full_name, phone, wilaya, address, total, order_items(title)")
    .in("id", ids);
  if (!orders?.length) return NextResponse.json({ error: "Commandes introuvables." }, { status: 404 });

  const header = ["Nom", "Prénom", "Téléphone", "Wilaya", "Adresse exacte", "Commande", "Produit", "Montant (DA)"];
  const lines = [header.map(cell).join(";")];
  for (const o of orders as any[]) {
    const full = String(o.full_name ?? "").trim();
    const parts = full.split(/\s+/);
    const prenom = parts.length > 1 ? parts[0] : "";
    const nom = parts.length > 1 ? parts.slice(1).join(" ") : full;
    const produit = ((o.order_items as any[]) ?? [])[0]?.title ?? "";
    lines.push([
      nom, prenom, o.phone ?? "", o.wilaya ?? "", o.address ?? "",
      o.order_number ?? "", produit, o.total ?? "",
    ].map(cell).join(";"));
  }
  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="livraison.csv"`,
    },
  });
}
