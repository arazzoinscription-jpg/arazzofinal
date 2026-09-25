"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { scoreLevelTest, explainResult, type LevelTest } from "@/lib/level-test-score";

// Soumission d'un test de niveau depuis le site : calcul du résultat CÔTÉ SERVEUR
// (le barème ne transite pas par le navigateur) + enregistrement du passage dans
// Supabase (`level_test_leads`). Arazzo OS le RAPATRIE dans son CRM au clic
// « Synchroniser » (il y recalcule le niveau à l'identique).

const Schema = z.object({
  slug: z.string().trim().min(1),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
  lang: z.enum(["fr", "ar"]).optional(),
  contact: z.object({
    first_name: z.string().trim().max(120).optional().or(z.literal("")),
    last_name: z.string().trim().max(120).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
  }).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export async function submitLevelTest(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "validation_failed" };
  const d = parsed.data;

  const supabase = createPublicClient();

  // 1. Lit la définition COMPLÈTE (avec le barème) — côté serveur uniquement.
  const { data: row } = await supabase
    .from("level_test_snapshots")
    .select("data")
    .eq("slug", d.slug)
    .maybeSingle();
  if (!row?.data) return { ok: false as const, error: "test_not_found" };
  const test = row.data as LevelTest;

  // 2. Calcule le résultat (pur, déterministe) + l'explication.
  const result = scoreLevelTest(test, d.answers);
  const lang = d.lang ?? (test.language === "ar" ? "ar" : "fr");
  const explanation = explainResult(test, result, { lang });

  // 3. Enregistre le passage (contact + réponses). Best-effort : même si l'écriture
  //    échoue, on rend le résultat à la personne (l'expérience ne doit pas casser).
  const c = d.contact ?? {};
  try {
    await supabase.from("level_test_leads").insert({
      slug: d.slug,
      first_name: c.first_name || null,
      last_name: c.last_name || null,
      email: c.email || null,
      phone: c.phone || null,
      city: c.city || null,
      answers: d.answers,
      level_key: result.level?.key ?? null,
      level_label: result.level?.label ?? null,
      score: result.score,
      lang,
      utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
    });
  } catch { /* le passage anonyme reste valable */ }

  return {
    ok: true as const,
    result: {
      level_label: result.level?.label ?? null,
      score: result.score,
      max_score: result.max_score,
      skills: result.skills,
      recommendation: result.recommendation,
      explanation,
    },
  };
}
