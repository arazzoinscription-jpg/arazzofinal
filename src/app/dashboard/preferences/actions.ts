"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PrefsSchema = z.object({
  welcome: z.boolean(),
  purchases: z.boolean(),
  new_content: z.boolean(),
  teacher_reply: z.boolean(),
  private_msg: z.boolean(),
  certificates: z.boolean(),
  reactivation: z.boolean(),
  announcements: z.boolean(),
});

export type PrefsInput = z.infer<typeof PrefsSchema>;

export async function saveEmailPreferences(input: PrefsInput) {
  const parsed = PrefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("email_preferences")
    .upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/preferences");
  return { ok: true };
}
