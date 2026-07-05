"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addRole, primaryRole } from "@/lib/roles";

async function guardAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return prof?.role === "admin" ? user : null;
}

export async function approveRoleRequest(id: string) {
  const reviewer = await guardAdmin();
  if (!reviewer) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("role_requests")
    .select("user_id, requested_role, statut")
    .eq("id", id)
    .single();
  if (!req) return { ok: false, error: "Demande introuvable" };

  // 1) Ajout du rôle demandé À L'ENSEMBLE (sans écraser les autres espaces).
  const { data: cur } = await admin
    .from("users").select("roles, role").eq("id", req.user_id).maybeSingle();
  const nextRoles = addRole(cur?.roles ?? (cur?.role ? [cur.role] : []), req.requested_role as "formateur" | "patronniste");
  const { error: roleErr } = await admin
    .from("users")
    .update({ roles: nextRoles, role: primaryRole(nextRoles) })
    .eq("id", req.user_id);
  if (roleErr) return { ok: false, error: roleErr.message };

  // 2) Marquer la demande
  await admin
    .from("role_requests")
    .update({ statut: "approuve", reviewed_by: reviewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/demandes");
  return { ok: true };
}

export async function rejectRoleRequest(id: string) {
  const reviewer = await guardAdmin();
  if (!reviewer) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("role_requests")
    .update({ statut: "refuse", reviewed_by: reviewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/demandes");
  return { ok: true };
}
