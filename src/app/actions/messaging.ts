"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendMessageCore, listConversations, getConversation, markConversationRead,
  getContacts, unreadCount, autoriseA, type Role,
} from "@/lib/messaging";
import { BUCKET_MESSAGES, dureePiece, extensionPour, typeDeBase, verifierPiece, type GenrePiece } from "@/lib/messagerie-pieces";

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

/**
 * Une photo ou un message vocal (FormData : toId, kind « image » | « audio », fichier, duree, texte facultatif).
 * Vérifie le droit d'écrire AVANT de déposer le fichier, dans le stockage PRIVÉ « messages ».
 */
export async function sendChatPiece(fd: FormData) {
  const toId = fd.get("toId");
  const kind = fd.get("kind");
  const fichier = fd.get("fichier");
  if (!isUuid(toId)) return { ok: false, error: "Destinataire invalide." };
  if (!(fichier instanceof File)) return { ok: false, error: "Fichier manquant." };
  const pb = verifierPiece({ kind, type: fichier.type, size: fichier.size, duree: fd.get("duree") });
  if (pb) return { ok: false, error: pb };
  const genre = kind as GenrePiece;
  const m = await me();
  if (!m) return { ok: false, error: "Non authentifié." };
  const droit = await autoriseA(m.admin, { id: m.id, role: m.role }, toId);
  if (!droit.ok) return droit;

  const chemin = `${m.id}/${randomUUID()}.${extensionPour(genre, fichier.type)}`;
  const up = await m.admin.storage.from(BUCKET_MESSAGES).upload(chemin, Buffer.from(await fichier.arrayBuffer()), { contentType: typeDeBase(fichier.type), upsert: false });
  if (up.error) {
    return { ok: false, error: /bucket|not found/i.test(up.error.message) ? "Photos et messages vocaux pas encore activés (migration 104 à appliquer)." : "Envoi du fichier impossible, réessayez." };
  }
  const texte = typeof fd.get("texte") === "string" ? (fd.get("texte") as string) : "";
  const res = await sendMessageCore(m.admin, { id: m.id, role: m.role }, toId, texte, { kind: genre, path: chemin, duree: dureePiece(genre, fd.get("duree")) });
  if (!res.ok) { await m.admin.storage.from(BUCKET_MESSAGES).remove([chemin]); return res; }
  revalidatePath("/messages");
  return res;
}

/**
 * Vidéo ronde « face caméra » (1 min) — étape 1 : droits et format vérifiés, puis un lien d'ENVOI DIRECT
 * du téléphone vers le stockage privé (une vidéo dépasse la taille qu'accepte le serveur du site).
 */
export async function preparerVideoMessage(entree: { toId: unknown; type: unknown; taille: unknown; duree: unknown }) {
  if (!isUuid(entree.toId)) return { ok: false as const, error: "Destinataire invalide." };
  const type = typeof entree.type === "string" ? entree.type : "";
  const pb = verifierPiece({ kind: "video", type, size: Number(entree.taille) || 0, duree: entree.duree });
  if (pb) return { ok: false as const, error: pb };
  const m = await me();
  if (!m) return { ok: false as const, error: "Non authentifié." };
  const droit = await autoriseA(m.admin, { id: m.id, role: m.role }, entree.toId);
  if (!droit.ok) return { ok: false as const, error: droit.error };
  const chemin = `${m.id}/${randomUUID()}.${extensionPour("video", type)}`;
  const { data, error } = await m.admin.storage.from(BUCKET_MESSAGES).createSignedUploadUrl(chemin);
  if (error || !data) {
    return { ok: false as const, error: /bucket|not found/i.test(error?.message ?? "") ? "Vidéos pas encore activées (migration 104 à appliquer)." : "Envoi impossible, réessayez." };
  }
  return { ok: true as const, chemin, jeton: data.token, type: typeDeBase(type) };
}

/** Vidéo ronde — étape 2 : le fichier est bien arrivé dans SON dossier → le message part. */
export async function finaliserVideoMessage(entree: { toId: unknown; chemin: unknown; duree: unknown; texte?: unknown }) {
  if (!isUuid(entree.toId)) return { ok: false, error: "Destinataire invalide." };
  const m = await me();
  if (!m) return { ok: false, error: "Non authentifié." };
  const chemin = typeof entree.chemin === "string" ? entree.chemin : "";
  const [dossier, nom] = chemin.split("/");
  if (dossier !== m.id || !nom || !/^[0-9a-f-]{36}\.(webm|mp4|mov)$/i.test(nom)) return { ok: false, error: "Vidéo invalide." };
  const { data: present } = await m.admin.storage.from(BUCKET_MESSAGES).list(dossier, { search: nom, limit: 1 });
  if (!present?.some((f) => f.name === nom)) return { ok: false, error: "La vidéo n'est pas arrivée, réessayez." };
  const texte = typeof entree.texte === "string" ? entree.texte : "";
  const res = await sendMessageCore(m.admin, { id: m.id, role: m.role }, entree.toId, texte, { kind: "video", path: chemin, duree: dureePiece("video", entree.duree) });
  if (!res.ok) { await m.admin.storage.from(BUCKET_MESSAGES).remove([chemin]); return res; }
  revalidatePath("/messages");
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
