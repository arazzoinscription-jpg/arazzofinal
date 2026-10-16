import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { espaceDeCompte } from "@/lib/espace/load";
import { clochesEchues, etatMigrationCloches, sonnerCloche } from "@/lib/cloches/load";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fait partir les cloches de classe PROGRAMMÉES arrivées à l'heure.
 * À appeler chaque minute (pg_cron + pg_net, voir supabase/migrations/098_classe_cloches.sql),
 * avec l'en-tête « Authorization: Bearer <CRON_SECRET> ». Chaque cloche n'est envoyée qu'une fois.
 * Les droits de l'enseignante AUTRICE s'appliquent (ses classes seulement).
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (await etatMigrationCloches(admin)) return NextResponse.json({ ok: true, ignore: "migration 098 absente" });

  const echues = await clochesEchues(admin, new Date());
  const resultats: { id: string; ok: boolean; destinataires?: number; erreur?: string }[] = [];
  for (const c of echues) {
    // eslint-disable-next-line no-await-in-loop
    const espace = await espaceDeCompte(c.created_by);
    if (!espace) {
      // L'autrice n'est plus formatrice : on annule plutôt que d'envoyer sans droits.
      // eslint-disable-next-line no-await-in-loop
      await admin.from("classe_cloches").update({ annulee_le: new Date().toISOString() }).eq("id", c.id).is("envoyee_le", null);
      resultats.push({ id: c.id, ok: false, erreur: "autrice sans droits : annulée" });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const r = await sonnerCloche(admin, espace, c.id);
    resultats.push(r.ok ? { id: c.id, ok: true, destinataires: r.destinataires } : { id: c.id, ok: false, erreur: r.erreur });
  }
  return NextResponse.json({ ok: true, envoyees: resultats.filter((r) => r.ok).length, resultats });
}
