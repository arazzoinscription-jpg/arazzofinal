import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Schema = z.object({
  lessonId: z.string().uuid(),
  position: z.number().min(0),
  duration: z.number().min(0),
  ended: z.boolean().optional(),
});

/**
 * Enregistre la progression vidéo : position (reprise) + % max regardé.
 * Upsert dans video_progress (un enregistrement par user × leçon).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { lessonId, position, duration, ended } = parsed.data;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  // Lire l'existant pour ne garder que le % maximum atteint
  const { data: existing } = await supabase
    .from("video_progress")
    .select("watched_pct, watched_complete")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const maxPct = Math.max(existing?.watched_pct ?? 0, pct);
  const complete = existing?.watched_complete || ended === true || maxPct >= 95;

  const { error } = await supabase.from("video_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      last_position_sec: Math.round(position),
      duration_sec: Math.round(duration),
      watched_pct: Number(maxPct.toFixed(2)),
      watched_complete: complete,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, watched_pct: Number(maxPct.toFixed(2)), complete });
}
