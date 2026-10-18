import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_MESSAGES, LIEN_TTL_S, apercuPiece, type GenrePiece } from "@/lib/messagerie-pieces";
import { lireParIds } from "@/lib/student-care/paginate";

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
  /** Photo ou message vocal (migration 104) : lien de lecture temporaire. */
  piece?: { kind: GenrePiece; url: string | null; duree: number | null } | null;
}

/** Les colonnes « pièce » existent-elles (migration 104) ? Repli silencieux sinon. */
function colonnesPieceAbsentes(error: { message?: string; code?: string } | null): boolean {
  return Boolean(error && (error.code === "42703" || /piece_/.test(error.message ?? "")));
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
  // Par paquets de 150 : un seul `.in()` avec des centaines d'élèves dépassait la longueur d'adresse (échec → aucun contact).
  const data = await lireParIds<{ id: string; nom: string | null; role: Role; avatar_url: string | null }>(ids, (lot, de, a) => admin
    .from("users").select("id, nom, role, avatar_url").in("id", lot).order("id").range(de, a)).catch(() => []);
  data.forEach((u) =>
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
      // TOUTES ses élèves : la base ne rend que 1 000 inscriptions par demande (une élève à 12 modules = 12 lignes).
      const enr = await lireParIds<{ user_id: string }>(courseIds, (lot, de, a) => admin
        .from("enrollments").select("user_id").in("course_id", lot).order("id").range(de, a)).catch(() => []);
      studentIds = [...new Set(enr.map((e) => e.user_id).filter(Boolean))];
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
      // TOUS ses acheteurs (la base ne rend que 1 000 achats par demande).
      const pur = await lireParIds<{ user_id: string }>(patronIds, (lot, de, a) => admin
        .from("patron_purchases").select("user_id").in("patron_id", lot).order("id").range(de, a)).catch(() => []);
      buyerIds = [...new Set(pur.map((p) => p.user_id).filter(Boolean))];
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
  const lire = (cols: string) => admin
    .from("messages")
    .select(cols)
    .or(`from_user.eq.${meId},to_user.eq.${meId}`)
    .order("created_at", { ascending: false })
    .limit(1000);
  let { data: msgs, error } = await lire("from_user, to_user, body, created_at, read_at, piece_kind, piece_duree");
  if (colonnesPieceAbsentes(error)) ({ data: msgs } = await lire("from_user, to_user, body, created_at, read_at"));

  const byOther = new Map<string, { lastBody: string; lastAt: string; unread: number }>();
  for (const m of (msgs ?? []) as unknown as { from_user: string; to_user: string; body: string; created_at: string; read_at: string | null; piece_kind?: GenrePiece | null; piece_duree?: number | null }[]) {
    const other = m.from_user === meId ? m.to_user : m.from_user;
    const cur = byOther.get(other) ?? { lastBody: "", lastAt: "", unread: 0 };
    if (!cur.lastAt) { cur.lastBody = m.body || apercuPiece(m.piece_kind, m.piece_duree); cur.lastAt = m.created_at; } // messages triés desc → 1er = dernier
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
  const lire = (cols: string) => admin
    .from("messages")
    .select(cols)
    .or(`and(from_user.eq.${meId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${meId})`)
    .order("created_at", { ascending: true })
    .limit(300);
  let { data, error } = await lire("id, from_user, to_user, body, created_at, piece_kind, piece_path, piece_duree");
  if (colonnesPieceAbsentes(error)) ({ data } = await lire("id, from_user, to_user, body, created_at"));
  type Ligne = { id: string; from_user: string; to_user: string; body: string; created_at: string; piece_kind?: GenrePiece | null; piece_path?: string | null; piece_duree?: number | null };
  const lignes = (data ?? []) as unknown as Ligne[];
  // Photos et vocaux : stockage PRIVÉ → liens de lecture temporaires, pour les deux membres de la conversation seulement.
  const chemins = [...new Set(lignes.map((m) => m.piece_path).filter((p): p is string => Boolean(p)))];
  const liens = new Map<string, string>();
  if (chemins.length) {
    const { data: signes } = await admin.storage.from(BUCKET_MESSAGES).createSignedUrls(chemins, LIEN_TTL_S);
    for (const s of (signes ?? []) as { path: string | null; signedUrl: string | null }[]) if (s.path && s.signedUrl) liens.set(s.path, s.signedUrl);
  }
  return lignes.map(({ piece_kind, piece_path, piece_duree, ...m }) => ({
    ...m,
    mine: m.from_user === meId,
    piece: piece_kind ? { kind: piece_kind, url: piece_path ? liens.get(piece_path) ?? null : null, duree: piece_duree ?? null } : null,
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

/** La personne connectée peut-elle écrire à `toId` ? (même règle pour un texte, une photo ou un vocal) */
export async function autoriseA(admin: Admin, me: { id: string; role: Role }, toId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!toId || toId === me.id) return { ok: false, error: "Destinataire invalide." };
  const targetRole = await roleOf(admin, toId);
  if (!targetRole) return { ok: false, error: "Destinataire introuvable." };
  if (!(await canMessage(admin, me, { id: toId, role: targetRole }))) {
    return { ok: false, error: "Vous n'êtes pas autorisé à contacter cette personne." };
  }
  return { ok: true };
}

export async function sendMessageCore(
  admin: Admin,
  me: { id: string; role: Role },
  toId: string,
  rawBody: string,
  /** Photo ou message vocal déjà déposé dans le stockage privé (migration 104). */
  piece: { kind: GenrePiece; path: string; duree: number | null } | null = null,
): Promise<{ ok: boolean; error?: string }> {
  const body = clean(rawBody);
  if (!body && !piece) return { ok: false, error: "Message vide." };

  const droit = await autoriseA(admin, me, toId);
  if (!droit.ok) return droit;

  const { error } = await admin.from("messages").insert({
    from_user: me.id, to_user: toId, body,
    ...(piece ? { piece_kind: piece.kind, piece_path: piece.path, piece_duree: piece.duree } : {}),
  });
  if (error) return { ok: false, error: colonnesPieceAbsentes(error) ? "Photos et messages vocaux pas encore activés (migration 104 à appliquer)." : error.message };

  // Notification destinataire (cloche existante + push), best-effort.
  try {
    const { data: sender } = await admin.from("users").select("nom").eq("id", me.id).maybeSingle();
    const title = `Nouveau message de ${sender?.nom ?? "un membre"}`;
    // Le push système est envoyé par le webhook /api/webhooks/push.
    await admin.from("notifications").insert({
      user_id: toId, type: "message", title, body: (body || apercuPiece(piece?.kind, piece?.duree)).slice(0, 120), link: "/dashboard",
    });
  } catch { /* ignore */ }

  return { ok: true };
}
