/**
 * Caméra et micro — le GUIDE d'autorisation (module PUR, testable).
 *
 * Un site ne peut pas ouvrir lui-même les réglages du téléphone ou de l'ordinateur : on reconnaît l'appareil et le
 * navigateur, et on donne les étapes exactes (comme les autres applications), avec, sur ordinateur, l'adresse des
 * réglages du site à coller dans la barre d'adresse (Chrome, Edge).
 */

export type Appareil = "android" | "iphone" | "pc";
export type Navigateur = "chrome" | "samsung" | "safari" | "firefox" | "edge" | "autre";
export type Besoin = "micro" | "camera";

export interface Contexte {
  appareil: Appareil;
  navigateur: Navigateur;
  installee: boolean;
  /** Ouvert DANS une application (lien partagé sur Instagram, Facebook, TikTok…) : caméra et micro souvent bloqués. */
  integre?: string | null;
}

/** Le navigateur intégré d'une application (Instagram, Facebook, TikTok, Snapchat, Messenger), sinon null. */
export function navigateurIntegre(userAgent: string): string | null {
  const ua = userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return /Messenger|MESSENGER/i.test(ua) ? "Messenger" : "Facebook";
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return "TikTok";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  return null;
}

/** L'appareil et le navigateur, d'après le « user-agent » ; `installee` = application ouverte depuis l'écran d'accueil. */
export function detecterContexte(userAgent: string, installee = false): Contexte {
  const ua = userAgent || "";
  const iphone = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  const android = /Android/i.test(ua);
  const appareil: Appareil = iphone ? "iphone" : android ? "android" : "pc";
  let navigateur: Navigateur = "autre";
  if (/SamsungBrowser/i.test(ua)) navigateur = "samsung";
  else if (/Edg(e|A|iOS)?\//i.test(ua)) navigateur = "edge";
  else if (/Firefox|FxiOS/i.test(ua)) navigateur = "firefox";
  else if (/CriOS|Chrome|Chromium/i.test(ua)) navigateur = "chrome";
  else if (/Safari/i.test(ua)) navigateur = "safari";
  return { appareil, navigateur, installee, integre: navigateurIntegre(ua) };
}

const NOMS: Record<Besoin, { court: string; deux: string }> = {
  micro: { court: "le micro", deux: "Micro" },
  camera: { court: "la caméra et le micro", deux: "Caméra et Micro" },
};

/** Les étapes à suivre quand l'accès a été REFUSÉ (le navigateur ne redemande plus de lui-même). */
export function etapesAutorisation(c: Contexte, besoin: Besoin): string[] {
  const { deux } = NOMS[besoin];
  // Lien ouvert DANS Instagram / Facebook / TikTok : leur navigateur bloque caméra et micro → ouvrir le vrai navigateur.
  if (c.integre) {
    if (c.appareil === "iphone") {
      return [
        `Le site est ouvert dans l’application ${c.integre}, qui bloque ${NOMS[besoin].court}.`,
        "Touchez « ⋯ » (en haut ou en bas à droite), puis « Ouvrir dans le navigateur » (Safari).",
        `Dans Safari, touchez de nouveau ${besoin === "micro" ? "🎤" : "🎥"} puis « Autoriser ».`,
        "Pour la suite, installez l’application Arazzo depuis Safari (Partager › « Sur l’écran d’accueil ») : plus de blocage.",
      ];
    }
    return [
      `Le site est ouvert dans l’application ${c.integre}, qui bloque ${NOMS[besoin].court}.`,
      "Touchez le bouton vert « Ouvrir dans Chrome » ci-dessous (ou ⋮ en haut à droite › « Ouvrir dans Chrome »).",
      `Dans Chrome, touchez de nouveau ${besoin === "micro" ? "🎤" : "🎥"} puis « Autoriser ».`,
      "Pour la suite, installez l’application Arazzo depuis Chrome : plus de blocage.",
    ];
  }
  if (c.appareil === "iphone") {
    if (c.installee) {
      return [
        "Ouvrez les Réglages de l’iPhone (l’icône ⚙️ grise).",
        `Touchez « Safari », puis descendez jusqu’à « ${besoin === "micro" ? "Microphone" : "Caméra » et « Microphone"} ».`,
        "Choisissez « Autoriser » (ou « Demander »).",
        "Fermez l’application Arazzo, rouvrez-la, puis touchez « Réessayer ».",
      ];
    }
    if (c.navigateur === "chrome") {
      return [
        "Ouvrez les Réglages de l’iPhone (l’icône ⚙️ grise).",
        "Descendez jusqu’à « Chrome » et touchez-le.",
        `Activez ${deux === "Micro" ? "« Micro »" : "« Caméra » et « Micro »"}.`,
        "Revenez ici et touchez « Réessayer ».",
      ];
    }
    return [
      "En haut (ou en bas) de l’écran, touchez « aA » à gauche de l’adresse du site.",
      "Touchez « Réglages du site web ».",
      `Mettez ${deux === "Micro" ? "« Micro »" : "« Caméra » et « Micro »"} sur « Autoriser ».`,
      "Touchez « OK », puis « Réessayer » ici.",
      "Toujours bloqué ? Réglages de l’iPhone › Safari › Caméra / Microphone › « Autoriser ».",
    ];
  }
  if (c.appareil === "android") {
    if (c.installee) {
      return [
        "Ouvrez les Paramètres du téléphone (l’icône ⚙️).",
        `Applications › ${c.navigateur === "samsung" ? "Samsung Internet" : "Chrome"} › Autorisations.`,
        `Mettez ${deux === "Micro" ? "« Micro »" : "« Appareil photo » et « Micro »"} sur « Autoriser seulement si l’appli est en cours d’utilisation ».`,
        "Revenez dans l’application Arazzo et touchez « Réessayer ».",
      ];
    }
    return [
      "En haut, touchez le petit cadenas 🔒 (ou l’icône ⚙️) à gauche de l’adresse du site.",
      "Touchez « Autorisations » (ou « Paramètres du site »).",
      `Mettez ${deux === "Micro" ? "« Micro »" : "« Caméra » et « Micro »"} sur « Autoriser ».`,
      "Revenez ici et touchez « Réessayer ».",
      `Toujours bloqué ? Paramètres du téléphone › Applications › ${c.navigateur === "samsung" ? "Samsung Internet" : "Chrome"} › Autorisations › ${deux} › « Autoriser ».`,
    ];
  }
  // Ordinateur
  if (c.navigateur === "firefox") {
    return [
      "À gauche de l’adresse du site, cliquez sur l’icône de caméra ou de micro barrée.",
      "Cliquez sur la croix à côté de « Bloqué temporairement » (ou « Bloqué »).",
      "Rechargez la page (touche F5), puis cliquez sur « Réessayer ».",
    ];
  }
  if (c.navigateur === "safari") {
    return [
      "Dans la barre du haut du Mac, cliquez sur « Safari › Réglages pour formation-arazzo.store… ».",
      `Mettez ${deux === "Micro" ? "« Micro »" : "« Caméra » et « Micro »"} sur « Autoriser ».`,
      "Rechargez la page, puis cliquez sur « Réessayer ».",
    ];
  }
  return [
    "À gauche de l’adresse du site, cliquez sur le cadenas 🔒 (ou l’icône des réglages).",
    `Mettez ${deux === "Micro" ? "« Micro »" : "« Caméra » et « Micro »"} sur « Autoriser ».`,
    "Rechargez la page (touche F5), puis cliquez sur « Réessayer ».",
    "Ou : copiez l’adresse des réglages (bouton vert) et collez-la dans la barre d’adresse.",
    "Toujours bloqué sur Windows ? Paramètres › Confidentialité et sécurité › Caméra / Microphone › autorisez l’accès (et les applications de bureau).",
  ];
}

/** Sur ordinateur (Chrome, Edge) : la page des réglages DE CE SITE, à coller dans la barre d'adresse. */
export function adresseReglages(c: Contexte, site: string): string | null {
  if (c.appareil !== "pc") return null;
  const s = encodeURIComponent(site.replace(/\/+$/, ""));
  if (c.navigateur === "chrome") return `chrome://settings/content/siteDetails?site=${s}`;
  if (c.navigateur === "edge") return `edge://settings/content/siteDetails?site=${s}`;
  return null;
}

/** Android, lien ouvert dans une application : la même page dans Chrome (lien « intent »). */
export function lienOuvrirChrome(c: Contexte, adresse: string): string | null {
  if (!c.integre || c.appareil !== "android") return null;
  try {
    const u = new URL(adresse);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

export type Echec = "refuse" | "absent" | "occupe" | "non_pris_en_charge" | "autre";

/** Pourquoi l'accès a échoué (nom de l'erreur du navigateur). */
export function raisonEchec(nom: unknown): Echec {
  const n = typeof nom === "string" ? nom : "";
  if (n === "NotAllowedError" || n === "PermissionDeniedError" || n === "SecurityError") return "refuse";
  if (n === "NotFoundError" || n === "DevicesNotFoundError" || n === "OverconstrainedError") return "absent";
  if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") return "occupe";
  if (n === "TypeError" || n === "NotSupportedError") return "non_pris_en_charge";
  return "autre";
}

/** Le message d'un échec qui n'est PAS un refus (pas de réglage à changer). */
export function messageEchec(e: Exclude<Echec, "refuse">, besoin: Besoin): string {
  const quoi = NOMS[besoin].court;
  if (e === "absent") return besoin === "micro" ? "Aucun micro trouvé sur cet appareil." : "Aucune caméra (ou aucun micro) trouvée sur cet appareil.";
  if (e === "occupe") return `${quoi.charAt(0).toUpperCase()}${quoi.slice(1)} ${besoin === "micro" ? "est utilisé" : "sont utilisés"} par une autre application (appel, visio…) : fermez-la, puis réessayez.`;
  if (e === "non_pris_en_charge") return "Ce navigateur ne permet pas d’enregistrer ici : ouvrez le site dans Chrome ou Safari.";
  return `Impossible d’ouvrir ${quoi} pour le moment. Réessayez.`;
}
