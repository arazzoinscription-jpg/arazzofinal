"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Confirme automatiquement l'email d'un compte tout juste inscrit, pour une
 * inscription SANS friction (les élèves n'ont pas à cliquer un lien email).
 *
 * Sécurité : ne confirme QUE les comptes créés il y a moins de 15 minutes et
 * encore non confirmés. Confirmer l'email ne donne aucun accès sans le mot de
 * passe — le risque est nul, mais la fenêtre de 15 min évite tout usage détourné.
 */
export async function autoConfirmNewAccount(userId: string) {
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) return { ok: false as const, error: "Identifiant invalide." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(parsed.data);
  if (error || !data?.user) return { ok: false as const, error: "Compte introuvable." };

  const u = data.user;
  if (u.email_confirmed_at) return { ok: true as const }; // déjà confirmé

  const createdMs = u.created_at ? new Date(u.created_at).getTime() : 0;
  if (!createdMs || Date.now() - createdMs > 15 * 60 * 1000) {
    return { ok: false as const, error: "Compte trop ancien pour la confirmation automatique." };
  }

  const { error: upErr } = await admin.auth.admin.updateUserById(parsed.data, { email_confirm: true });
  if (upErr) return { ok: false as const, error: upErr.message };
  return { ok: true as const };
}

/**
 * Auto-guérison à la connexion : confirme l'email d'un compte resté « non
 * confirmé » (anciennes inscriptions bloquées) afin qu'il puisse se connecter.
 * Confirmer l'email ne donne aucun accès sans le mot de passe (revalidé juste
 * après par signInWithPassword côté client).
 */
export async function confirmAccountByEmail(email: string) {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(clean).success) return { ok: false as const };

  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("id").eq("email", clean).maybeSingle();
  const id = (prof as { id?: string } | null)?.id;
  if (!id) return { ok: false as const };

  const { data } = await admin.auth.admin.getUserById(id);
  if (data?.user?.email_confirmed_at) return { ok: true as const }; // déjà confirmé

  const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
  if (error) return { ok: false as const };
  return { ok: true as const };
}
