import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOURS_48 = 48 * 60 * 60 * 1000;

/**
 * Supprime les images de publications de plus de 48 h :
 *  - fichier physique dans le bucket 'posts'
 *  - référence en base (image_url / storage_path mis à NULL, expired = TRUE)
 * L'affichage bascule alors sur un placeholder « Image expirée ».
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - HOURS_48).toISOString();

  // Images expirées non encore traitées
  const { data: expired, error } = await admin
    .from("post_images")
    .select("id, post_id, storage_path")
    .eq("expired", false)
    .lt("uploaded_at", cutoff)
    .limit(500);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!expired || expired.length === 0) return NextResponse.json({ ok: true, removed: 0 });

  // 1) Suppression physique des fichiers
  const paths = expired.map((e) => e.storage_path).filter(Boolean) as string[];
  if (paths.length > 0) await admin.storage.from("posts").remove(paths);

  // 2) Effacement des références en base + marquage expiré
  const ids = expired.map((e) => e.id);
  await admin
    .from("post_images")
    .update({ image_url: null, storage_path: null, expired: true })
    .in("id", ids);

  // 3) Nettoyage du raccourci posts.image_url pour les publications concernées
  const postIds = [...new Set(expired.map((e) => e.post_id))];
  for (const pid of postIds) {
    const { count } = await admin
      .from("post_images")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid)
      .eq("expired", false);
    if (!count) await admin.from("posts").update({ image_url: null }).eq("id", pid);
  }

  return NextResponse.json({ ok: true, removed: ids.length });
}
