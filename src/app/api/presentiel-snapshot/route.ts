import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rafraîchissement léger de la jauge de places : la landing relit l'instantané
// (`presentiel_snapshots`) toutes les 25 s. On ne renvoie QUE `seats` et
// `groups_open` — juste ce que la jauge consomme, jamais tout l'instantané.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("presentiel_snapshots")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();

  const d = (row?.data ?? {}) as Record<string, unknown>;
  return NextResponse.json(
    { seats: d.seats ?? null, groups_open: d.groups_open ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
