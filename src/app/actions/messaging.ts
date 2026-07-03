"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendMessageCore, listConversations, getConversation, markConversationRead,
  getContacts, unreadCount, type Role,
} from "@/lib/messaging";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  return { admin, id: user.id, role: (prof?.role ?? "eleve") as Role };
}

export async function sendChatMessage(toId: string, body: string) {
  if (!isUuid(toId)) return { ok: false, error: "Destinataire invalide." };
  const m = await me();
  if (!m) return { ok: false, error: "Non authentifié." };
  const res = await sendMessageCore(m.admin, { id: m.id, role: m.role }, toId, body);
  if (res.ok) revalidatePath("/messages");
  return res;
}

export async function loadConversation(otherId: string) {
  if (!isUuid(otherId)) return { ok: false as const, error: "Conversation invalide.", messages: [] };
  const m = await me();
  if (!m) return { ok: false as const, error: "Non authentifié.", messages: [] };
  const messages = await getConversation(m.admin, m.id, otherId);
  await markConversationRead(m.admin, m.id, otherId);
  return { ok: true as const, messages };
}

export async function loadInbox() {
  const m = await me();
  if (!m) return { ok: false as const, error: "Non authentifié.", conversations: [], contacts: [], role: "eleve" as Role };
  const [conversations, contacts] = await Promise.all([
    listConversations(m.admin, m.id),
    getContacts(m.admin, { id: m.id, role: m.role }),
  ]);
  return { ok: true as const, conversations, contacts, role: m.role };
}

export async function searchContacts(q: string) {
  const m = await me();
  if (!m) return { ok: false as const, error: "Non authentifié.", contacts: [] };
  const contacts = await getContacts(m.admin, { id: m.id, role: m.role }, q);
  return { ok: true as const, contacts };
}

export async function getUnreadCount() {
  const m = await me();
  if (!m) return 0;
  return unreadCount(m.admin, m.id);
}
