"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteResource(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "formateur" && prof?.role !== "admin") return { ok: false };

  const admin = createAdminClient();
  const { data: r } = await admin.from("resources").select("file_path").eq("id", id).single();
  if (r?.file_path) await admin.storage.from("resources").remove([r.file_path]);
  await admin.from("resources").delete().eq("id", id);
  revalidatePath("/formateur/ressources");
  return { ok: true };
}
