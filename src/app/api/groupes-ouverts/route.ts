import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NIVEAUX } from "@/lib/niveaux";
import { groupesOuverts, interesseesEnAttente } from "@/lib/groupes-places-load";

export const dynamic = "force-dynamic";

/**
 * Groupes EN LIGNE ouverts à l'inscription, par niveau : places, places prises, date de début.
 * Lu par l'OS pour l'e-mail automatique « les places partent ». PUBLIC et sans donnée personnelle
 * (noms de groupes, dates, nombres) — exactement ce que la landing affiche déjà.
 */
export async function GET() {
  const admin = createAdminClient();
  const niveaux = await Promise.all(Object.entries(NIVEAUX).map(async ([slug, courseId]) => {
    const groupes = await groupesOuverts(admin, courseId);
    return {
      niveau: slug,
      course_id: courseId,
      interessees: groupes.length ? await interesseesEnAttente(admin, courseId) : 0,
      groupes: groupes.map((g) => ({
        id: g.id, nom: g.nom, debut: g.debut, places: g.capacite, prises: g.prises,
        restantes: g.capacite ? Math.max(0, g.capacite - g.prises) : null,
      })),
    };
  }));
  return NextResponse.json({ ok: true, maj: new Date().toISOString(), niveaux }, { headers: { "Cache-Control": "public, max-age=30" } });
}
