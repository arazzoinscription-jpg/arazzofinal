"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur } from "@/lib/roles";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: string | null = null;
  let staff = false;
  if (user) {
    const { data } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
    role = data?.role ?? null;
    staff = isFormateur(data);
  }
  return { supabase, user, role, isStaff: staff };
}

const CreateSchema = z.object({
  sujet: z.string().min(3, "Sujet trop court"),
  body: z.string().min(3, "Message trop court"),
  priorite: z.enum(["basse", "normale", "haute"]),
});

export async function createTicket(input: z.infer<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ user_id: user.id, sujet: parsed.data.sujet, priorite: parsed.data.priorite, statut: "ouvert" })
    .select().single();
  if (error || !ticket) return { ok: false, error: error?.message };

  await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, user_id: user.id, body: parsed.data.body });

  // Notifier les admins
  const admin = createAdminClient();
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  if (admins?.length) {
    await admin.from("notifications").insert(admins.map((a) => ({
      user_id: a.id, type: "ticket", title: "🎫 Nouveau ticket : " + parsed.data.sujet,
      body: parsed.data.body.slice(0, 120), link: `/formateur/tickets/${ticket.id}`,
    })));
  }
  revalidatePath("/dashboard/support");
  return { ok: true, id: ticket.id };
}

export async function addMessage(ticketId: string, body: string) {
  if (!body || body.trim().length < 1) return { ok: false, error: "Message vide." };
  const { supabase, user, isStaff } = await ctx();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, user_id: user.id, body: body.trim() });
  if (error) return { ok: false, error: error.message };

  const admin = createAdminClient();
  await admin.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
  const { data: ticket } = await admin.from("tickets").select("user_id, sujet").eq("id", ticketId).single();

  // Notifier l'autre partie
  if (ticket) {
    if (isStaff && ticket.user_id !== user.id) {
      await admin.from("notifications").insert({ user_id: ticket.user_id, type: "ticket",
        title: "💬 Réponse à votre ticket", body: ticket.sujet, link: `/dashboard/support/${ticketId}` });
    } else if (!isStaff) {
      const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
      if (admins?.length) await admin.from("notifications").insert(admins.map((a) => ({
        user_id: a.id, type: "ticket", title: "💬 Nouvelle réponse ticket", body: ticket.sujet,
        link: `/formateur/tickets/${ticketId}` })));
    }
  }
  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/formateur/tickets/${ticketId}`);
  return { ok: true };
}

export async function setStatus(ticketId: string, statut: "ouvert" | "en_cours" | "resolu" | "ferme") {
  const { supabase, user, isStaff } = await ctx();
  if (!isStaff || !user) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("tickets").update({ statut, updated_at: new Date().toISOString() }).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };

  const admin = createAdminClient();
  const { data: t } = await admin.from("tickets").select("user_id, sujet").eq("id", ticketId).single();
  const labels: Record<string, string> = { ouvert: "rouvert", en_cours: "en cours de traitement", resolu: "résolu", ferme: "fermé" };
  if (t) await admin.from("notifications").insert({ user_id: t.user_id, type: "ticket",
    title: `🎫 Ticket ${labels[statut]}`, body: t.sujet, link: `/dashboard/support/${ticketId}` });

  revalidatePath(`/formateur/tickets/${ticketId}`);
  return { ok: true };
}

export async function assignToMe(ticketId: string) {
  const { supabase, user, isStaff } = await ctx();
  if (!isStaff || !user) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("tickets").update({ assigned_to: user.id, statut: "en_cours" }).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formateur/tickets/${ticketId}`);
  return { ok: true };
}
