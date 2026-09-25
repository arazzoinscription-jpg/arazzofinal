import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

// Téléversement (preuve de paiement OU photo d'un modèle sur-mesure) → bucket
// PUBLIC `patron-proofs` en anon (policy `anon_insert_patron_proofs` de la
// migration 085). Renvoie l'URL publique — visible ensuite depuis l'OS.

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
  "image/webp": ".webp", "application/pdf": ".pdf",
};

export async function POST(req: NextRequest) {
  const contentType = (req.headers.get("content-type") || "").split(";")[0].trim();
  const ext = EXT[contentType];
  if (!ext) return NextResponse.json({ error: "unsupported_file" }, { status: 415 });

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const path = `${crypto.randomUUID()}${ext}`;
  const supabase = createPublicClient();
  const { error } = await supabase.storage.from("patron-proofs").upload(path, buf, {
    contentType, upsert: false, cacheControl: "31536000",
  });
  if (error) return NextResponse.json({ error: "upload_failed" }, { status: 502 });

  const { data } = supabase.storage.from("patron-proofs").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
