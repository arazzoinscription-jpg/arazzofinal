import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { publicQuestions, type LevelTest } from "@/lib/level-test-score";

// Les QUESTIONS du test de niveau, pour l'afficher en popup. On lit l'instantané
// poussé par l'OS (`level_test_snapshots`) et on renvoie les questions SANS les
// points ni les tags internes — le calcul se fait côté serveur (server action).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });

  const supabase = createPublicClient();
  const { data: row } = await supabase
    .from("level_test_snapshots")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();

  if (!row?.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const test = row.data as LevelTest & { subtitle?: string; dir?: string; consent_text?: string };
  return NextResponse.json({
    slug,
    title: test.title ?? null,
    subtitle: test.subtitle ?? null,
    description: test.description ?? null,
    language: test.language ?? "fr",
    dir: (test as any).dir ?? (test.language === "ar" ? "rtl" : "ltr"),
    consent_text: (test as any).consent_text ?? null,
    questions: publicQuestions(test),
  }, { headers: { "Cache-Control": "no-store" } });
}
