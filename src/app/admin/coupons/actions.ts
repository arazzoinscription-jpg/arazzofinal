"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient() };
}

const CouponSchema = z.object({
  code: z.string().min(2).max(30),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export async function createCoupon(input: z.infer<typeof CouponSchema>) {
  const parsed = CouponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const d = parsed.data;
  const { error } = await admin.from("coupons").insert({
    code: d.code.trim().toUpperCase(),
    type: d.type,
    value: d.value,
    max_uses: d.max_uses ?? null,
    expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
    active: true,
  });
  if (error) return { ok: false, error: error.message.includes("duplicate") ? "Ce code existe déjà." : error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCoupon(id: string, active: boolean) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("coupons").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}
