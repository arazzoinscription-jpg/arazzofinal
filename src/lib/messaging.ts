import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";

type Admin = ReturnType<typeof createAdminClient>;
export type Role = "eleve" | "formateur" | "patronniste" | "admin";

export interface Contact {
  id: string;
  nom: string;
  role: Role;
  avatar_url: string | null;
  group?: string; // libellé de regroupement (ex. « Mes formateurs »)
}
export interface ConversationSummary {
  otherId: string;
  nom: string;
  role: Role;
  avatar_url: string | null;
  lastBody: string;
  lastAt: string;
  unread: number;
}
export interface ChatMessage {
  id: string;
  from_user: string;
  to_user: string;
  body: string;
  created_at: string;
  mine: boolean;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 4000);

// ─── Relations métier ────────────────────────────────────────────────────────
async function eleveEnrolledWithFormateur(admin: Admin, eleveId: string, formateurId: string): Promise<boolean> {
  const { data: courses } = await admin.from("courses").select("id").eq("formateur_id", formateurId);
  const ids = (courses ?? []).map((c) => c.id as string);
  if (!ids.length) return false;
  const { count } = await admin.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", eleveId).in("course_id", ids);
  return !!count && count > 0;
}
async function eleveBoughtFromPatronniste(admin: Admin, eleveId: string, patronnisteId: string): Promise<boolean> {
  const { data: patrons } = await admin.from("patrons").select("id").eq("formateur_id", patronnisteId);
  const ids = (patrons ?? []).map((p) => p.id as string);
  if (!ids.length) return false;
  const { count } = await admin.from("patron_purchases").select("*", { count: "exact", head: true }).eq("user_id", eleveId).in("patron_id", ids);
  return !!count && count > 0;
}

/**
 * Matrice « qui parle à qui » (symétrique) :
 *  - admin ↔ tout le monde
 *  - formateur ↔ ses élèves ET les patronnistes
 *  - patronniste ↔ ses acheteurs ET les formateurs
 *  - élève ↔ son formateur uniquement
 *  - acheteur ↔ son patronniste uniquement
 */
export async function canMessage(admin: Admin, a: { id: string; role: Role }, b: { id: string; role: Role }): Promise<boolean> {
  if (!a.id || !b.id || a.id === b.id) return false;
  if (a.role === "admin" || b.role === "admin") return true;

  const has = (r: Role) => a.role === r || b.role === r;
  if (has("formateur") && has("patronniste")) return true;

  if (has("formateur") && has("eleve")) {
    const f = a.role === "formateur" ? a : b;
    const e = a.role === "eleve" ? a : b;
    return eleveEnrolledWithFormateur(admin, e.id, f.id);
  }
  if (has("patronniste") && has("eleve")) {
    const p = a.role === "patronniste" ? a : b;
    const e = a.role === "eleve" ? a : b;
    return eleveBoughtFromPatronniste(admin, e.id, p.id);
  }
  return false;
}

async function roleOf(admin: Admin, userId: string): Promise<Role | null> {
  const { data } = await admin.from("users").select("role").eq("id", userId).maybeSingle();
  const r = data?.role as Role | undefined;
  return r ?? null;
}

// ─── Contacts autorisés ──────────────────────────────────────────────────────
async function usersByIds(admin: Admin, ids: string[]): Promise<Map<string, { nom: string; role: Role; avatar_url: string | null }>> {
  const map = new Map<string, { nom: string; role: Role; avatar_url: string | null }>();
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return map;
  const { data } = await admin.from("users").select("id, nom, role, avatar_url").in("id", uniq);
  (data ?? []).forEach((u: { id: string; nom: string | null; role: Role; avatar_url: string | null }) =>
    map.set(u.id, { nom: u.nom ?? "Utilisateur", role: (u.role ?? "eleve") as Role, avatar_url: u.avatar_url ?? null }));
  return map;
}

export async function getContacts(admin: Admin, me: { id: string; role: Role }, q = ""): Promise<Contact[]> {
  const out: Contact[] = [];
  const push = (id: string, u: { nom: string; role: Role; avatar_url: string | null } | undefined, group: string) => {
    if (u && id !== me.id) out.push({ id, nom: u.nom, role: u.role, avatar_url: u.avatar_url, group });
  };

  if (me.role === "admin") {
    const query = q.trim()
      ? admin.from("users").select("id, nom, role, avatar_url").or(`nom.ilike.%${q}%,email.ilike.%${q}%`).limit(30)
      : admin.from("users").select("id, nom, role, avatar_url").order("created_at", { ascending: false }).limit(30);
    const { data } = await query;
    (data ?? []).forEach((u: { id: string; nom: string | null; role: Role; avatar_url: string | null }) =>
      push(u.id, { nom: u.nom ?? "Utilisateur", role: (u.role ?? "eleve") as Role, avatar_url: u.avatar_url ?? null }, "Utilisateurs"));
    return dedupe(out);
  }

  if (me.role === "eleve") {
    // Formateurs de ses cours
    const { data: enr } = await admin.from("enrollments").select("course:courses(formateur_id)").eq("user_id", me.id);
    const formateurIds = (enr ?? []).map((e: { course: { formateur_id?: string }[] | { formateur_id?: string } | null }) => {
      const c = Array.isArray(e.course) ? e.course[0] : e.course; return c?.formateur_id;
    }).filter(Boolean) as string[];
    // Patronnistes de ses patrons achetés
    const { data: pur } = await admin.from("patron_purchases").select("patron:patrons(formateur_id)").eq("user_id", me.id);
    const patronnisteIds = (pur ?? []).map((p: { patron: { formateur_id?: string }[] | { formateur_id?: string } | null }) => {
      const pt = Array.isArray(p.patron) ? p.patron[0] : p.patron; return pt?.formateur_id;
    }).filter(Boolean) as string[];
    const map = await usersByIds(admin, [...formateurIds, ...patronnisteIds]);
    formateurIds.forEach((id) => push(id, map.get(id), "Mes formateurs"));
    patronnisteIds.forEach((id) => push(id, map.get(id), "Mes patronnistes"));
    return dedupe(out);
  }

  if (me.role === "formateur") {
    // Ses élèves (inscrits à ses cours)
    const { data: courses } = await admin.from("courses").select("id").eq("formateur_id", me.id);
    const courseIds = (courses ?? []).map((c) => c.id as string);
    let studentIds: string[] = [];
    if (courseIds.length) {
      const { data: enr } = await admin.from("enrollments").select("user_id").in("course_id", courseIds).limit(2000);
      studentIds = [...new Set((enr ?? []).map((e: { user_id: string }) => e.user_id).filter(Boolean))];
    }
    const map = await usersByIds(admin, studentIds);
    studentIds.forEach((id) => push(id, map.get(id), "Mes élèves"));
    // + tous les patronnistes
    const { data: pats } = await admin.from("users").select("id, nom, role, avatar_url").eq("role", "patronniste").limit(200);
    (pats ?? []).forEach((u: { id: string; nom: string | null; role: Role; avatar_url: string | null }) =>
      push(u.id, { nom: u.nom ?? "Patronniste", role: "patronniste", avatar_url: u.avatar_url ?? null }, "Patronnistes"));
    return dedupe(out);
  }

  if (me.role === "patronniste") {
    // Ses acheteurs
    const { data: patrons } = await admin.from("patrons").select("id").eq("formateur_id", me.id);
    const patronIds = (patrons ?? []).map((p) => p.id as string);
    let buyerIds: string[] = [];
    if (patronIds.length) {
      const { data: pur } = await admin.from("patron_purchases").select("user_id").in("patron_id", patronIds).limit(2000);
      buyerIds = [...new Set((pur ?? []).map((p: { user_id: string }) => p.user_id).filter(Boolean))];
    }
    const map = await usersByIds(admin, buyerIds);
    buyerIds.forEach((id) => push(id, map.get(id), "Mes acheteurs"));
    // + tous les formateurs
    const { data: forms } = await admin.from("users").select("id, nom, role, avatar_url").eq("role", "formateur").limit(200);
    (forms ?? []).forEach((u: { id: string; nom: string | null; role: Role; avatar_url: string | null }) =>
      push(u.id, { nom: u.nom ?? "Formateur", role: "formateur", avatar_url: u.avatar_url ?? null }, "Formateurs"));
    return dedupe(out);
  }

  return out;
}

function dedupe(list: Contact[]): Contact[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// ─── Conversations & messages ────────────────────────────────────────────────
export async function listConversations(admin: Admin, meId: string): Promise<ConversationSummary[]> {
  const { data: msgs } = await admin
    .from("messages")
    .select("from_user, to_user, body, created_at, read_at")
    .or(`from_user.eq.${meId},to_user.eq.${meId}`)
    .order("created_at", { ascending: false })
    .limit(1000);

  const byOther = new Map<string, { lastBody: string; lastAt: string; unread: number }>();
  for (const m of (msgs ?? []) as { from_user: string; to_user: string; body: string; created_at: string; read_at: string | null }[]) {
    const other = m.from_user === meId ? m.to_user : m.from_user;
    const cur = byOther.get(other) ?? { lastBody: "", lastAt: "", unread: 0 };
    if (!cur.lastAt) { cur.lastBody = m.body; cur.lastAt = m.created_at; } // messages triés desc → 1er = dernier
    if (m.to_user === meId && !m.read_at) cur.unread += 1;
    byOther.set(other, cur);
  }
  const map = await usersByIds(admin, [...byOther.keys()]);
  return [...byOther.entries()].map(([otherId, v]) => {
    const u = map.get(otherId);
    return { otherId, nom: u?.nom ?? "Utilisateur", role: u?.role ?? "eleve", avatar_url: u?.avatar_url ?? null, ...v };
  }).sort((a, b) => (b.lastAt).localeCompare(a.lastAt));
}

export async function getConversation(admin: Admin, meId: string, otherId: string): Promise<ChatMessage[]> {
  const { data } = await admin
    .from("messages")
    .select("id, from_user, to_user, body, created_at")
    .or(`and(from_user.eq.${meId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${meId})`)
    .order("created_at", { ascending: true })
    .limit(300);
  return (data ?? []).map((m: { id: string; from_user: string; to_user: string; body: string; created_at: string }) => ({
    ...m, mine: m.from_user === meId,
  }));
}

export async function markConversationRead(admin: Admin, meId: string, otherId: string): Promise<void> {
  await admin.from("messages").update({ read_at: new Date().toISOString() })
    .eq("to_user", meId).eq("from_user", otherId).is("read_at", null);
}

export async function unreadCount(admin: Admin, meId: string): Promise<number> {
  const { count } = await admin.from("messages").select("*", { count: "exact", head: true }).eq("to_user", meId).is("read_at", null);
  return count ?? 0;
}

export async function sendMessageCore(
  admin: Admin,
  me: { id: string; role: Role },
  toId: string,
  rawBody: string,
): Promise<{ ok: boolean; error?: string }> {
  const body = clean(rawBody);
  if (!body) return { ok: false, error: "Message vide." };
  if (!toId || toId === me.id) return { ok: false, error: "Destinataire invalide." };

  const targetRole = await roleOf(admin, toId);
  if (!targetRole) return { ok: false, error: "Destinataire introuvable." };
  if (!(await canMessage(admin, me, { id: toId, role: targetRole }))) {
    return { ok: false, error: "Vous n'êtes pas autorisé à contacter cette personne." };
  }

  const { error } = await admin.from("messages").insert({ from_user: me.id, to_user: toId, body });
  if (error) return { ok: false, error: error.message };

  // Notification destinataire (cloche existante + push), best-effort.
  try {
    const { data: sender } = await admin.from("users").select("nom").eq("id", me.id).maybeSingle();
    const title = `Nouveau message de ${sender?.nom ?? "un membre"}`;
    await admin.from("notifications").insert({
      user_id: toId, type: "message", title, body: body.slice(0, 120), link: null,
    });
    await sendPushToUsers(admin, [toId], {
      title, body: body.slice(0, 120), url: "/dashboard", tag: `msg-${me.id}`,
    });
  } catch { /* ignore */ }

  return { ok: true };
}
