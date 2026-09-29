"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/**
 * Inscription EN LIGNE avec PREUVE de paiement (CCP / BaridiMob), 24/7, sans
 * tunnel. La cliente paie, joint son reçu, et laisse ses coordonnées : le tout
 * est déposé dans Supabase (`online_enrollment_leads` + bucket `online-proofs`).
 * Arazzo OS le RAPATRIE ensuite dans son CRM au clic « Synchroniser », où le
 * bouton « Valider » passe l'inscription au VERT (compte LMS + enrôlement +
 * e-mail de bienvenue). Le back-end de validation reste dans l'OS ; ici on ne
 * fait que collecter honnêtement la demande et la preuve.
 */

const ADMIN = process.env.ARAZZO_ADMIN_EMAIL || "arazzoinscription@gmail.com";
const PROOFS_BUCKET = "online-proofs";
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10 Mo

/**
 * URL d'upload SIGNÉE pour déposer le reçu directement navigateur → Supabase
 * (contourne la limite de 4,5 Mo des fonctions serverless Vercel). Le chemin est
 * un UUID non devinable ; le service role autorise l'upload sans exposer la clé.
 */
export async function createOnlineProofUploadUrl(ext: string) {
  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!["jpg", "jpeg", "png", "pdf"].includes(cleanExt)) {
    return { ok: false as const, error: "Format non supporté (JPG, PNG ou PDF uniquement)." };
  }
  const path = `${randomUUID()}.${cleanExt}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(PROOFS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, path: data.path, token: data.token };
}

const Schema = z.object({
  level: z.string().trim().min(1, "validation_failed"),
  course_id: z.string().trim().max(64).optional().or(z.literal("")),
  full_name: z.string().trim().min(2, "validation_failed"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  wilaya: z.string().trim().max(80).optional().or(z.literal("")),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  method: z.string().trim().max(40).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  coupon_code: z.string().trim().max(60).optional().or(z.literal("")),
  proof_path: z.string().trim().min(3, "validation_failed"),
  consent: z.boolean().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

function esc(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function submitOnlineEnrollment(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "validation_failed" };
  }
  const d = parsed.data;
  if (!d.email && !d.phone) {
    return { ok: false as const, error: "Un e-mail ou un numéro WhatsApp est requis." };
  }
  const amount = d.amount === "" || d.amount == null ? null : Number(d.amount);
  if (amount != null && !Number.isFinite(amount)) {
    return { ok: false as const, error: "Montant invalide." };
  }

  const admin = createAdminClient();

  // URL publique du reçu (bucket public, chemin non devinable) : c'est elle que
  // l'OS affichera dans le CRM et attachera à l'inscription.
  const { data: pub } = admin.storage.from(PROOFS_BUCKET).getPublicUrl(d.proof_path);
  const proofUrl = pub?.publicUrl ?? null;
  if (!proofUrl) return { ok: false as const, error: "Preuve introuvable. Réessayez." };

  // Dépôt (service role : contourne la RLS). L'OS rapatrie ensuite.
  const { error } = await admin.from("online_enrollment_leads").insert({
    level: d.level,
    course_id: d.course_id || null,
    full_name: d.full_name,
    phone: d.phone || null,
    email: d.email || null,
    wilaya: d.wilaya || null,
    amount,
    method: d.method || "ccp",
    reference: d.reference || null,
    proof_url: proofUrl,
    coupon_code: d.coupon_code ? d.coupon_code.toUpperCase() : null,
    consent: Boolean(d.consent),
    lang: d.lang || null,
    source: d.utm?.utm_source || "landing-lms",
    utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
  });
  if (error) return { ok: false as const, error: "Envoi impossible. Réessayez." };

  // Alerte l'administratrice (best-effort). La validation, elle, se fait dans l'OS.
  const rows: [string, string][] = [
    ["Formation (en ligne)", d.level],
    ["Nom", d.full_name],
    ["WhatsApp", d.phone || "—"],
    ["E-mail", d.email || "—"],
    ["Wilaya", d.wilaya || "—"],
    ["Montant", amount != null ? `${amount} DA` : "—"],
    ["Méthode", d.method || "CCP / BaridiMob"],
    ["Référence", d.reference || "—"],
  ];
  const trs = rows
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#6b6480;white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
  const adminHtml = `
    <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">💳 Nouvelle preuve de paiement (en ligne)</h2>
    <p style="color:#4b5563">Une cliente a payé et joint son reçu sur le site. La demande sera importée dans le CRM d'Arazzo OS à la prochaine synchronisation : cliquez « Valider » pour créer son accès.</p>
    <p style="margin:8px 0"><a href="${esc(proofUrl)}" style="color:#5B16F9;font-weight:600">📎 Voir le reçu</a></p>
    <table style="width:100%;border-collapse:collapse;background:#f6f3ff;border-radius:12px">${trs}</table>`;
  try {
    await sendEmail({
      to: ADMIN, category: "welcome", force: true,
      subject: `💳 Preuve de paiement — ${d.level}`, html: adminHtml,
    });
  } catch { /* l'e-mail admin ne doit pas bloquer le dépôt */ }

  // Accusé de réception à la cliente (best-effort).
  if (d.email) {
    const prospectHtml = `
      <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">Preuve bien reçue 🌸</h2>
      <p style="color:#4b5563">Bonjour ${esc(d.full_name)}, nous avons bien reçu votre preuve de paiement pour la formation <b>${esc(d.level)}</b> (en ligne).</p>
      <p style="color:#4b5563">Notre équipe la vérifie puis <b>active votre accès</b> : vous recevrez alors un e-mail avec vos identifiants de connexion. 🌸</p>
      <p style="color:#9ca3af;font-size:13px">Arazzo Formation</p>`;
    try {
      await sendEmail({
        to: d.email, category: "welcome", force: true,
        subject: "Votre preuve de paiement Arazzo est bien reçue", html: prospectHtml,
      });
    } catch { /* best-effort */ }
  }

  return { ok: true as const };
}

// ─── Flux « comme l'OS » : inscription d'abord, PUIS preuve ──────────────────
// On crée la demande SANS preuve, on envoie un e-mail avec les infos de paiement
// (CCP/BaridiMob) + un bouton « fiche d'inscription » + un bouton « confirmer mon
// paiement » (retour sur la page pour uploader le reçu). La preuve est attachée
// ensuite via `attachOnlineProof`. Aucune synchro OS requise pour l'e-mail.

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store").replace(/\/$/, "");

const CreateSchema = z.object({
  level: z.string().trim().min(1, "validation_failed"),
  course_id: z.string().trim().max(64).optional().or(z.literal("")),
  full_name: z.string().trim().min(2, "validation_failed"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  wilaya: z.string().trim().max(80).optional().or(z.literal("")),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  coupon_code: z.string().trim().max(60).optional().or(z.literal("")),
  consent: z.boolean().optional(),
  lang: z.enum(["fr", "ar"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

/** Coordonnées de paiement actives (CCP/BaridiMob), depuis le LMS. */
async function lirePaiement(admin: ReturnType<typeof createAdminClient>) {
  try {
    const { data } = await admin
      .from("ccp_config")
      .select("account_number, account_key, beneficiary_name, rip")
      .eq("is_active", true).limit(1).maybeSingle();
    return data ?? null;
  } catch { return null; }
}

export async function createOnlineEnrollment(input: unknown) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "validation_failed" };
  const d = parsed.data;
  if (!d.email && !d.phone) return { ok: false as const, error: "Un e-mail ou un numéro WhatsApp est requis." };
  const amount = d.amount === "" || d.amount == null ? null : Number(d.amount);

  const admin = createAdminClient();
  const { data: lead, error } = await admin.from("online_enrollment_leads").insert({
    level: d.level,
    course_id: d.course_id || null,
    full_name: d.full_name,
    phone: d.phone || null,
    email: d.email || null,
    wilaya: d.wilaya || null,
    amount,
    method: "ccp",
    proof_url: null, // la preuve viendra ensuite (attachOnlineProof)
    coupon_code: d.coupon_code ? d.coupon_code.toUpperCase() : null,
    consent: Boolean(d.consent),
    lang: d.lang || null,
    source: d.utm?.utm_source || "landing-lms",
    utm: d.utm && Object.keys(d.utm).length ? d.utm : null,
  }).select("id").maybeSingle();
  if (error || !lead?.id) return { ok: false as const, error: "Envoi impossible. Réessayez." };

  const pay = await lirePaiement(admin);

  // E-mail de paiement à la cliente (best-effort) : infos CCP/BaridiMob + 2 boutons.
  if (d.email) {
    const confirmUrl = `${SITE}/formation/${encodeURIComponent(d.level)}?req=${lead.id}`;
    const ficheUrl = `${SITE}/formation/${encodeURIComponent(d.level)}?methode=fiche`;
    const montant = amount != null ? `${amount.toLocaleString("fr-FR")} DA` : null;
    const infos = pay ? [
      ["Bénéficiaire", pay.beneficiary_name],
      ["N° CCP", pay.account_number],
      ["Clé", pay.account_key],
      ["RIP (BaridiMob / virement)", pay.rip],
    ].filter(([, v]) => v) : [];
    const infosTr = infos
      .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#6b6480;white-space:nowrap">${esc(String(k))}</td><td style="padding:6px 10px;font-weight:700;font-family:monospace">${esc(String(v))}</td></tr>`)
      .join("");
    const html = `
      <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 8px">Votre inscription est presque prête 🌸</h2>
      <p style="color:#4b5563">Bonjour ${esc(d.full_name)}, pour finaliser votre inscription à <b>${esc(d.level)}</b> (en ligne)${montant ? `, réglez <b>${esc(montant)}</b>` : ""} par CCP ou BaridiMob :</p>
      ${infosTr ? `<table style="width:100%;border-collapse:collapse;background:#f6f3ff;border-radius:12px;margin:10px 0">${infosTr}</table>` : `<p style="color:#4b5563">Les coordonnées de paiement vous seront communiquées — contactez-nous sur WhatsApp.</p>`}
      <div style="text-align:center;margin:22px 0">
        <a href="${esc(confirmUrl)}" style="display:inline-block;background:#5B16F9;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold">✅ Confirmer mon paiement (joindre le reçu)</a>
      </div>
      <p style="text-align:center;margin:14px 0">
        <a href="${esc(ficheUrl)}" style="color:#128a4c;font-weight:600">📝 Je préfère une fiche d'inscription (paiement à la livraison)</a>
      </p>
      <p style="color:#9ca3af;font-size:13px">Après réception de votre preuve, nous activons votre accès. Arazzo Formation.</p>`;
    try {
      await sendEmail({ to: d.email, category: "welcome", force: true, subject: "💳 Finalisez votre inscription Arazzo — paiement", html });
    } catch { /* best-effort */ }
  }

  return { ok: true as const, leadId: lead.id, payment: pay };
}

const AttachSchema = z.object({
  leadId: z.string().uuid("validation_failed"),
  proof_path: z.string().trim().min(3, "validation_failed"),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  method: z.string().trim().max(40).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function attachOnlineProof(input: unknown) {
  const parsed = AttachSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "validation_failed" };
  const d = parsed.data;
  const amount = d.amount === "" || d.amount == null ? null : Number(d.amount);

  const admin = createAdminClient();
  const { data: pub } = admin.storage.from(PROOFS_BUCKET).getPublicUrl(d.proof_path);
  const proofUrl = pub?.publicUrl ?? null;
  if (!proofUrl) return { ok: false as const, error: "Preuve introuvable. Réessayez." };

  const patch: Record<string, unknown> = { proof_url: proofUrl };
  if (amount != null && Number.isFinite(amount)) patch.amount = amount;
  if (d.method) patch.method = d.method;
  if (d.reference) patch.reference = d.reference;

  const { data: lead, error } = await admin
    .from("online_enrollment_leads").update(patch).eq("id", d.leadId)
    .select("email, full_name, level").maybeSingle();
  if (error) return { ok: false as const, error: "Envoi impossible. Réessayez." };

  // Accusé + alerte admin (best-effort).
  if (lead?.email) {
    const html = `
      <h2 style="font-family:Georgia,serif;color:#2A0880;margin:0 0 10px">Preuve bien reçue 🌸</h2>
      <p style="color:#4b5563">Bonjour ${esc(lead.full_name ?? "")}, nous avons bien reçu votre preuve de paiement pour <b>${esc(lead.level ?? "")}</b>. Notre équipe la vérifie puis active votre accès. 🌸</p>`;
    try { await sendEmail({ to: lead.email, category: "welcome", force: true, subject: "Votre preuve de paiement Arazzo est bien reçue", html }); } catch { /* best-effort */ }
  }
  try {
    await sendEmail({ to: ADMIN, category: "welcome", force: true, subject: `💳 Preuve reçue — ${lead?.level ?? ""}`,
      html: `<p>Une preuve a été jointe. <a href="${esc(proofUrl)}">Voir le reçu</a>. À valider dans l'OS (Synchroniser → Valider).</p>` });
  } catch { /* best-effort */ }

  return { ok: true as const };
}
