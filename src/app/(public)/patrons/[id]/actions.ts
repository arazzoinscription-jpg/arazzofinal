"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security/sanitize";
import { notifyAdminEmail } from "@/lib/admin-notify";

export interface PatronRequestInput {
  patronId: string;
  type: "impression_a0" | "placement";
  // Impression A0
  largeur?: string;            // "90" | "180" (cm)
  fullName?: string;
  phone?: string;
  wilaya?: string;
  address?: string;
  // Placement sur mesure
  tableLongueur?: string;
  tableLargeur?: string;
  laizeTissu?: string;         // largeur du rouleau / laize (cm)
  // commun
  tissu?: string;
  note?: string;
}

/**
 * Demande de fabrication pour un patron : impression A0 (livrée) OU placement sur mesure.
 * Enregistre une commande dans patron_custom_orders (visible côté patronniste : /patronniste/sur-mesure).
 */
export async function requestPatronFulfilment(input: PatronRequestInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connectez-vous pour passer cette commande." };

  if (!z.string().uuid().safeParse(input.patronId).success) return { ok: false, error: "Patron invalide." };
  if (input.type !== "impression_a0" && input.type !== "placement") return { ok: false, error: "Type invalide." };

  const admin = createAdminClient();
  const { data: patron } = await admin
    .from("patrons").select("id, titre, formateur_id, preview_url, prix_dzd").eq("id", input.patronId).maybeSingle();
  if (!patron) return { ok: false, error: "Patron introuvable." };

  const isPlacement = input.type === "placement";

  let titre: string;
  let mesures: Record<string, unknown>;
  let taille: string | null = null;

  if (input.type === "impression_a0") {
    if (!input.fullName?.trim() || !input.phone?.trim() || !input.wilaya?.trim()) {
      return { ok: false, error: "Renseignez vos coordonnées de livraison (nom, téléphone, wilaya)." };
    }
    const largeur = input.largeur === "180" ? "180" : "90";
    titre = `Impression A0 (${largeur} cm) — ${patron.titre}`;
    taille = `Papier traceur ${largeur} cm`;
    mesures = {
      type: "impression_a0",
      largeur_cm: largeur,
      livraison: {
        nom: sanitizeText(input.fullName).slice(0, 120),
        telephone: sanitizeText(input.phone).slice(0, 40),
        wilaya: sanitizeText(input.wilaya).slice(0, 60),
        adresse: sanitizeText(input.address).slice(0, 300),
      },
    };
  } else {
    if (!input.tableLongueur?.trim() || !input.tableLargeur?.trim() || !input.laizeTissu?.trim()) {
      return { ok: false, error: "Renseignez les mesures de la table et la laize du tissu." };
    }
    titre = `Placement sur mesure — ${patron.titre}`;
    mesures = {
      type: "placement",
      kind: "placement_patron", // → flux devis (2 prix PDF/papier) au lieu de l'envoi direct
      table: { longueur_cm: input.tableLongueur.trim(), largeur_cm: input.tableLargeur.trim() },
      tissu: { laize_cm: input.laizeTissu.trim(), matiere: (input.tissu ?? "").trim() },
    };
  }

  const { data: created, error } = await admin.from("patron_custom_orders").insert({
    client_id: user.id,
    // Placement : non assigné (diffusé aux patronnistes après acceptation du devis).
    patronniste_id: isPlacement ? null : (patron.formateur_id ?? null),
    patron_id: patron.id,
    titre,
    tissu: sanitizeText(input.tissu).slice(0, 120) || null,
    taille,
    mesures,
    note: sanitizeText(input.note).slice(0, 500) || null,
    // Placement → devis admin d'abord ; impression A0 → envoi direct.
    statut: isPlacement ? "price_requested" : "en_attente",
  }).select("id").single();
  if (error) return { ok: false, error: error.message };

  // Notification au client
  try {
    await admin.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: input.type === "impression_a0" ? "🖨️ Demande d'impression reçue" : "📐 Demande de placement reçue — devis en cours",
      body: input.type === "impression_a0"
        ? "Nous avons reçu votre demande d'impression A0. Nous vous contactons pour la livraison."
        : "Demande de placement bien reçue. Vous allez recevoir un devis (par email et dans « Sur mesure »). Vous pourrez l'accepter et choisir PDF ou papier imprimé.",
      link: isPlacement ? "/dashboard/sur-mesure" : "/dashboard/commandes",
    });
  } catch { /* ignore */ }

  // Notification admin par email (avec la fiche/le modèle du patron à chiffrer).
  await notifyAdminEmail(
    isPlacement ? "📐 Devis à faire — placement sur mesure (patron)" : "🖨️ Nouvelle commande patron (impression A0)",
    {
      "Type": isPlacement ? "Placement sur mesure (à chiffrer : prix PDF + papier)" : "Impression A0",
      "Patron": patron.titre,
      "Fiche / modèle": patron.preview_url || "—",
      "Prix PDF du patron (réf.)": patron.prix_dzd ? `${Number(patron.prix_dzd).toLocaleString("fr-DZ")} DA` : "—",
      "Cliente": user.email,
      "Coordonnées / mesures": isPlacement
        ? `Table ${input.tableLongueur}×${input.tableLargeur} cm · laize ${input.laizeTissu} cm`
        : `${(input.fullName ?? "").trim()} · ${(input.phone ?? "").trim()} · ${(input.wilaya ?? "").trim()}`,
      "Tissu": (input.tissu ?? "").trim() || "—",
    },
    {
      intro: isPlacement
        ? "Une cliente attend un devis de placement. Proposez le prix PDF et le prix papier imprimé."
        : "Une commande d'impression A0 vient d'être passée.",
      link: "/admin/sur-mesure",
    },
  );

  return { ok: true };
}
