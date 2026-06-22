import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPatronnistes } from "@/lib/sur-mesure-notify";

export const dynamic = "force-dynamic";

/**
 * 2ᵉ signal : ré-alerte les patronnistes pour les commandes sur mesure restées
 * SANS preneur depuis plus de 24 h. À déclencher par un cron (vercel.json).
 * Protégé par CRON_SECRET (header Authorization: Bearer <secret>).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await admin
    .from("patron_custom_orders")
    .select("id, titre")
    .is("patronniste_id", null)
    .eq("statut", "en_attente")
    .is("second_signal_at", null)
    .lt("created_at", cutoff);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!stale?.length) return NextResponse.json({ ok: true, realerted: 0 });

  for (const o of stale) {
    await notifyPatronnistes(admin, {
      title: "⏰ Commande sur mesure toujours libre",
      body: `« ${o.titre} » attend depuis plus de 24 h. Une patronniste peut encore la prendre.`,
    });
  }
  await admin
    .from("patron_custom_orders")
    .update({ second_signal_at: new Date().toISOString() })
    .in("id", stale.map((o) => o.id));

  return NextResponse.json({ ok: true, realerted: stale.length });
}
