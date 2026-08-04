import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDeliverySheet, splitFullName, XLSX_CONTENT_TYPE, type DeliveryRow,
} from "@/lib/delivery-sheet";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Feuille de livraison (XLSX) des DIPLÔMES prêts à expédier (CNI reçue), au format
 * exact du modèle de la société de livraison (`model_v5.1.xlsx`). Réservé à l'admin.
 *
 * `?ids=a,b,c` exporte uniquement ces diplômes ; sans `ids`, tous ceux dont le
 * statut est « CNI reçue » ou « généré ».
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 500);

  const admin = createAdminClient();
  let query = admin
    .from("diplomas")
    .select("id, full_name, phone, wilaya, commune, address, numero, status, user:users(nom), course:courses(titre_fr)");
  query = ids.length
    ? query.in("id", ids)
    : query.in("status", ["cni_uploaded", "generated"]);
  const { data: rows } = await query.order("updated_at", { ascending: false });

  const sheet: DeliveryRow[] = ((rows ?? []) as any[]).map((d) => {
    const { nom, prenom } = splitFullName(d.full_name ?? d.user?.nom);
    return {
      nom, prenom,
      telephone: d.phone ?? "",
      adresse: d.address ?? "",
      commune: d.commune ?? "",
      wilaya: d.wilaya ?? "",
      numeroCommande: d.numero ?? "",
      produit: `Diplôme${d.course?.titre_fr ? ` — ${d.course.titre_fr}` : ""}`,
      // Le diplôme est déjà payé avec la formation : rien à encaisser à la livraison.
      prix: 0,
    };
  });

  const file = await buildDeliverySheet(sheet);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="diplomes-livraison-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
