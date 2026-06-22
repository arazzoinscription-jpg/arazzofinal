"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** L'élève téléverse sa CNI (photo) pour son diplôme. Stockée en privé (bucket proofs). */
export async function uploadCni(diplomaId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: dip } = await admin.from("diplomas").select("id, user_id, status").eq("id", diplomaId).maybeSingle();
  if (!dip || dip.user_id !== user.id) return { ok: false as const, error: "Diplôme introuvable." };

  const file = formData.get("cni") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "Photo manquante." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "La CNI doit être une image." };
  if (file.size > 8 * 1024 * 1024) return { ok: false as const, error: "Image trop lourde (max 8 Mo)." };

  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `cni/${user.id}/${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from("proofs").upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { ok: false as const, error: "Envoi échoué : " + upErr.message };

    await admin.from("diplomas").update({ cni_path: path, status: "cni_uploaded", updated_at: new Date().toISOString() }).eq("id", diplomaId);
    revalidatePath("/dashboard/diplome");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
