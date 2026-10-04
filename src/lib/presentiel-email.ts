/**
 * E-mail de confirmation d'une inscription PRÉSENTIELLE faite par formulaire sur le site.
 *
 * C'est le MÊME e-mail que celui d'Arazzo OS (écran présentiel) : même texte, même
 * mise en page, mêmes informations. Il dit la vérité sur la suite : la personne est
 * enregistrée, mais l'inscription n'est définitive qu'après avoir PASSÉ PAR LE CENTRE
 * DE FORMATION avec son dossier — il n'y a pas de rappel WhatsApp à attendre. Il joint
 * l'adresse et le BOUTON de localisation (Google Maps).
 *
 * Fonction pure : elle reçoit des faits (lus dans l'instantané de l'offre poussé par
 * l'OS) et rend `{ subject, html }`. Arabe par défaut, français au choix.
 */

const BRAND = { violet: "#5B16F9", violetDark: "#2A0880", orange: "#FE7223", ink: "#1a1230", soft: "#6b6480" };

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Le dossier est saisi à la main dans l'OS : on retire les « ** » et on garde « — » entre FR et AR. */
function propre(valeur: unknown) {
  return String(valeur ?? "").replace(/\s*\*{2,}\s*/g, " ").replace(/\s+\*\s+/g, " — ").replace(/\s+/g, " ").trim();
}

type Lang = "fr" | "ar";

const L: Record<Lang, Record<string, any>> = {
  fr: {
    dir: "ltr",
    subject: (n: string) => `Votre place pour ${n} — c’est bien noté`,
    hi: "Merci ! C’est bien noté 🌸",
    intro: (n: string) => `Votre inscription par formulaire pour <strong>${esc(n)}</strong> est bien enregistrée. Pour la finaliser, vous devez passer par notre centre de formation avec votre dossier (détails et localisation ci-dessous). Elle n’est définitive qu’après dépôt du dossier complet et validation par l’administration du centre.`,
    detailsTitle: "Les détails (estimation)",
    price: "Prix", perMonth: "/ mois", total: "soit au total",
    formula: "Formule choisie", sessionDuration: "Durée d’une séance",
    addonsTitle: "En plus (options)", importantTitle: "⭐ À noter",
    sessions: "Nombre de séances", schedule: "Horaire", days: "Vos disponibilités",
    start: "Démarrage estimé", places: "Places restantes (estimation)", city: "Lieu",
    dossierTitle: "📌 Dossier obligatoire au centre",
    dossierIntro: "Pour finaliser votre inscription, vous devez passer au centre déposer votre dossier officiel :",
    coming: "Comment venir", maps: "Ouvrir dans Google Maps",
    estimateNote: "Ces informations sont des estimations : le jour et la date exacts sont confirmés une fois le groupe constitué.",
    footer: "Vous recevez cet e-mail suite à votre inscription à une formation présentielle Arazzo à Sétif.",
    brand2: "Formation",
  },
  ar: {
    dir: "rtl",
    subject: (n: string) => `مكانك في ${n} — تم التسجيل`,
    hi: "شكرًا لك! تم التسجيل 🌸",
    intro: (n: string) => `تم تسجيلك عبر الاستمارة في <strong>${esc(n)}</strong>. لإتمام التسجيل يجب أن تمرّي بمركز التكوين مع ملفك (التفاصيل وموقع المركز أدناه). لا يُعتبر التسجيل نهائيًا إلا بعد إيداع الملف كاملاً ومصادقة إدارة المركز عليه.`,
    detailsTitle: "التفاصيل (تقديريًا)",
    price: "السعر", perMonth: "/ الشهر", total: "أي إجمالاً",
    formula: "الصيغة المختارة", sessionDuration: "مدة الحصة",
    addonsTitle: "خدمات إضافية", importantTitle: "⭐ ملاحظة مهمة",
    sessions: "عدد الحصص", schedule: "التوقيت", days: "أوقات حضورك",
    start: "بداية تقديرية", places: "الأماكن المتبقية (تقديريًا)", city: "المكان",
    dossierTitle: "📌 ملف مطلوب عند التسجيل بالمركز",
    dossierIntro: "لإتمام تسجيلك، يجب أن تمرّي بالمركز لإيداع ملفك الرسمي:",
    coming: "كيفية الوصول", maps: "افتحي في خرائط قوقل",
    estimateNote: "هذه المعلومات تقديرية: اليوم والتاريخ بالضبط يُؤكَّدان بمجرد اكتمال المجموعة.",
    footer: "وصلك هذا البريد بعد تسجيلك في تكوين حضوري لدى Arazzo بسطيف.",
    brand2: "تكوين",
  },
};

const DAY: Record<Lang, Record<string, string>> = {
  fr: { samedi: "Samedi", dimanche: "Dimanche", lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi", vendredi: "Vendredi" },
  ar: { samedi: "السبت", dimanche: "الأحد", lundi: "الإثنين", mardi: "الثلاثاء", mercredi: "الأربعاء", jeudi: "الخميس", vendredi: "الجمعة" },
};
const PERIOD: Record<Lang, Record<string, string>> = {
  fr: { matin: "matin", "apres-midi": "après-midi", soir: "soir" },
  ar: { matin: "صباحًا", "apres-midi": "بعد الظهر", soir: "مساءً" },
};

/** Traduit un identifiant de créneau (`samedi-matin`) dans la langue voulue. */
function creneau(id: string, lang: Lang) {
  const s = String(id ?? "");
  for (const p of ["matin", "apres-midi", "soir"]) {
    if (s.endsWith(`-${p}`)) {
      const jour = s.slice(0, s.length - p.length - 1);
      return `${DAY[lang][jour] ?? jour} ${PERIOD[lang][p] ?? p}`;
    }
  }
  return DAY[lang][s] ?? s;
}

function row(label: string, value: string | null) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr>
    <td style="padding:8px 0;color:${BRAND.soft};font-size:14px;vertical-align:top;">${esc(label)}</td>
    <td dir="auto" style="padding:8px 0;font-size:14px;font-weight:600;text-align:end;">${value}</td>
  </tr>`;
}

export type PresentielEmailFacts = {
  lang?: Lang;
  offerName?: string | null;
  city?: string | null;
  sessionLabel?: string | null;
  formulaLabel?: string | null;
  sessionDuration?: string | null;
  durationLabel?: string | null;
  sessionsCount?: number | null;
  priceLabel?: string | null;
  priceMonth?: number | null;
  priceTotal?: number | null;
  priceCurrency?: string | null;
  scheduleLabel?: string | null;
  startEstimate?: string | null;
  placesRemaining?: number | null;
  capacity?: number | null;
  availabilities?: string[];
  addons?: { label?: string; price_label?: string }[];
  importantNote?: string | null;
  center?: {
    address?: string | null; maps_url?: string | null;
    dossier_notice?: string | null; dossier_items?: string[] | null;
  } | null;
};

export function presentielConfirmationEmail(facts: PresentielEmailFacts = {}): { subject: string; html: string } {
  const lang: Lang = facts.lang === "fr" ? "fr" : "ar";
  const t = L[lang];
  const n = propre(facts.offerName) || (lang === "fr" ? "la formation" : "التكوين");
  const cur = facts.priceCurrency || "DZD";
  const center = facts.center ?? {};
  const loc = lang === "fr" ? "fr-FR" : "ar-DZ";
  const nb = (x: number) => x.toLocaleString(loc);

  const priceValue = facts.priceLabel
    ? esc(facts.priceLabel)
    : (Number.isFinite(facts.priceMonth)
      ? `${nb(Number(facts.priceMonth))} ${esc(cur)} <span style="color:${BRAND.soft};font-weight:400;">${t.perMonth}</span>`
        + (Number.isFinite(facts.priceTotal)
          ? `<br><span style="color:${BRAND.soft};font-weight:400;font-size:12px;">${t.total} ${nb(Number(facts.priceTotal))} ${esc(cur)}</span>` : "")
      : null);

  const daysValue = Array.isArray(facts.availabilities) && facts.availabilities.length
    ? facts.availabilities.map((id) => esc(creneau(id, lang))).join(" · ") : null;

  const sessionsValue = Number.isFinite(facts.sessionsCount)
    ? `${facts.sessionsCount}${facts.durationLabel ? ` <span style="color:${BRAND.soft};font-weight:400;">(${esc(facts.durationLabel)})</span>` : ""}`
    : (facts.durationLabel ? esc(facts.durationLabel) : null);

  const detailsTable = `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
    ${row(t.formula, facts.formulaLabel ? esc(facts.formulaLabel) : null)}
    ${row(t.price, priceValue)}
    ${row(t.sessionDuration, facts.sessionDuration ? esc(facts.sessionDuration) : null)}
    ${row(t.sessions, sessionsValue)}
    ${row(t.schedule, facts.scheduleLabel ? esc(facts.scheduleLabel) : null)}
    ${row(t.days, daysValue)}
    ${row(t.start, facts.startEstimate ? esc(facts.startEstimate) : (facts.sessionLabel ? esc(facts.sessionLabel) : null))}
    ${row(t.places, Number.isFinite(facts.placesRemaining) ? `${facts.placesRemaining}${Number.isFinite(facts.capacity) ? ` / ${facts.capacity}` : ""}` : null)}
    ${row(t.city, facts.city ? esc(facts.city) : null)}
  </table>`;

  const addons = Array.isArray(facts.addons) ? facts.addons.filter((a) => a && a.label) : [];
  const addonsBlock = addons.length
    ? `<p style="margin:16px 0 4px;font-weight:700;color:${BRAND.violetDark};font-size:15px;">${t.addonsTitle}</p>
       <ul style="margin:0;padding-inline-start:20px;">${addons.map((a) => `<li style="font-size:14px;line-height:1.6;">${esc(propre(a.label))}${a.price_label ? ` — <strong>${esc(a.price_label)}</strong>` : ""}</li>`).join("")}</ul>`
    : "";
  const noteBlock = facts.importantNote
    ? `<div style="background:#f1ecfe;border-radius:12px;padding:14px 16px;margin:16px 0;"><p style="margin:0;font-size:14px;line-height:1.6;"><strong>${t.importantTitle} :</strong> ${esc(propre(facts.importantNote))}</p></div>`
    : "";

  const items = Array.isArray(center.dossier_items) ? center.dossier_items.filter(Boolean) : [];
  const dossierItems = items.length
    ? `<ul style="margin:8px 0 0;padding-inline-start:20px;">${items.map((it) => `<li style="font-size:14px;line-height:1.6;">${esc(propre(it))}</li>`).join("")}</ul>`
    : "";
  const dossierBlock = (center.dossier_notice || dossierItems || center.address || center.maps_url)
    ? `<div style="background:#fff4ec;border:1px solid #ffd8bf;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 4px;font-weight:700;color:${BRAND.orange};font-size:15px;">${t.dossierTitle}</p>
        <p style="margin:0;font-size:14px;line-height:1.6;">${esc(propre(center.dossier_notice || t.dossierIntro))}</p>
        ${dossierItems}
        ${center.address ? `<p style="margin:10px 0 0;font-size:14px;"><strong>${t.coming} :</strong> ${esc(center.address)}</p>` : ""}
        ${center.maps_url ? `<p style="margin:14px 0 0;text-align:center;"><a href="${esc(center.maps_url)}" style="display:inline-block;background:${BRAND.violet};color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:12px;font-size:15px;">🗺️ ${t.maps}</a></p>` : ""}
      </div>`
    : "";

  const html = `<div dir="${t.dir}" style="margin:0;padding:0;background:#f6f3ff;font-family:'DM Sans',Segoe UI,Arial,sans-serif;color:${BRAND.ink};">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:${BRAND.violet};">Arazzo</span>
      <span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:${BRAND.orange};"> ${t.brand2}</span>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:28px 24px;box-shadow:0 6px 24px rgba(43,8,128,0.08);">
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;margin:0 0 12px;">${t.hi}</h1>
      <p style="font-size:15px;line-height:1.7;">${t.intro(n)}</p>
      <p style="margin:18px 0 0;font-weight:700;color:${BRAND.violetDark};font-size:15px;">${t.detailsTitle}</p>
      ${detailsTable}
      ${addonsBlock}
      ${noteBlock}
      ${dossierBlock}
      <p style="font-size:12px;color:${BRAND.soft};line-height:1.6;">${t.estimateNote}</p>
    </div>
    <p style="text-align:center;color:${BRAND.soft};font-size:12px;margin-top:20px;">${t.footer}</p>
  </div>
</div>`;

  return { subject: t.subject(n), html };
}
