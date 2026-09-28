import { NextResponse } from "next/server";
import { getLandingTexts } from "@/lib/landing-texts";

// Textes d'une landing édités dans l'OS (lecture anon). Utilisé par les composants
// CLIENT partagés (ex. le popup du test de niveau) ; les pages serveur, elles,
// appellent `getLandingTexts` directement.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") || "";
  const textes = await getLandingTexts(page);
  return NextResponse.json(textes, { headers: { "Cache-Control": "no-store" } });
}
