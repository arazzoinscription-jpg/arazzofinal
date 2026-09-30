import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccessLink, LONG_VALIDITY_MS } from "@/lib/access-link";
import { generateFichesPdf, type FicheInscription } from "@/lib/fiche-inscription-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/** Génère un PDF de fiches d'inscription (1 par commande sélectionnée) avec QR de reconnexion. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 200) : [];
  if (!ids.length) return NextResponse.json({ error: "Aucune commande sélectionnée." }, { status: 400 });

  const admin = createAdminClient();
  // `fiche_token` (migration 091) : jeton personnel du QR. Si la migration n'est pas
  // encore appliquée, on retombe sur l'ancienne sélection : l'export ne casse jamais.
  const premier = await admin
    .from("orders")
    .select("id, order_number, full_name, email, fiche_token, order_items(title)")
    .in("id", ids);
  let orders: any[] | null = premier.data;
  if (premier.error) {
    const repli = await admin
      .from("orders")
      .select("id, order_number, full_name, email, order_items(title)")
      .in("id", ids);
    orders = repli.data;
  }
  if (!orders?.length) return NextResponse.json({ error: "Commandes introuvables." }, { status: 404 });

  const fiches: FicheInscription[] = [];
  for (const o of orders as any[]) {
    // QR = la page personnelle de la commande : /fiche/<jeton>. Scanné APRÈS la
    // confirmation du paiement, il envoie l'e-mail d'accès et connecte la cliente ;
    // avant, il affiche « paiement en attente » (aucun accès).
    let link = SITE;
    if (o.fiche_token) {
      link = `${SITE}/fiche/${o.fiche_token}`;
    } else if (o.email) {
      // Repli (avant la migration) : lien d'accès personnel si la cliente a un compte.
      const { data: u } = await admin.from("users").select("id").eq("email", String(o.email).toLowerCase()).maybeSingle();
      if (u?.id) {
        const al = await createAccessLink(u.id, "/dashboard", LONG_VALIDITY_MS);
        if (al.ok && al.url) link = al.url;
      }
    }
    let qrDataUrl = "";
    try { qrDataUrl = await QRCode.toDataURL(link, { width: 360, margin: 1 }); } catch { /* ignore */ }
    fiches.push({
      fullName: o.full_name ?? "",
      formation: ((o.order_items as any[]) ?? [])[0]?.title ?? "Formation Arazzo",
      orderNumber: o.order_number ?? "",
      link,
      qrDataUrl,
    });
  }

  const pdf = await generateFichesPdf(fiches);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fiches-inscription.pdf"`,
    },
  });
}
