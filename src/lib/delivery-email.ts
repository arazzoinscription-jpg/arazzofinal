/**
 * E-mail automatique d'une Delivery Page (cours gratuit).
 *
 * Envoyé dès qu'une personne laisse ses coordonnées sur `/free/[slug]` :
 *   1. le lien pour REGARDER le cours (qui ouvre la page déjà débloquée, sur
 *      n'importe quel appareil) + le PDF s'il y en a un ;
 *   2. une PROPOSITION d'inscription : le bouton d'action de la page (offre
 *      payante associée) et un lien vers toutes les formations.
 *
 * Même habillage que les e-mails Arazzo (violet/orange). Fichier séparé : les
 * modèles partagés (`email-templates.ts`) ne sont pas modifiés.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Seules les adresses http(s) passent dans un lien (jamais `javascript:`…). */
function lienSur(url: unknown): string | null {
  const u = String(url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

function bouton(label: string, href: string, fond = "#E07840") {
  return `<div style="text-align:center;margin:18px 0;">
    <a href="${esc(href)}" style="display:inline-block;background:${fond};color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">${label}</a>
  </div>`;
}

export function deliveryCourseEmail(opts: {
  page: Record<string, any>;
  slug: string;
  name?: string | null;
  lang?: "fr" | "ar" | null;
}): { subject: string; html: string } {
  const { page, slug } = opts;
  const ar = opts.lang === "ar";
  const titre = (ar && page.title_ar) ? page.title_ar : (page.title || "Votre cours");
  const prenom = String(opts.name ?? "").trim().split(/\s+/)[0] || "";
  const coursUrl = `${SITE}/free/${encodeURIComponent(slug)}?acces=1`;
  const pdf = lienSur(page.pdf_url);
  const cta = lienSur(page.cta_url);
  const form = (page.capture_form ?? {}) as Record<string, any>;
  const intro = form.email_intro ? esc(form.email_intro).replace(/\n/g, "<br/>") : null;
  // Le code promo du moment (Live Engine), s'il est encore valable à l'envoi.
  const promo = page.promo?.code
    && page.promo.remaining !== 0
    && !(page.promo.end_date && Date.parse(page.promo.end_date) <= Date.now())
    ? page.promo as { code: string; discount_label?: string | null; remaining?: number | null; end_date?: string | null }
    : null;
  const finPromo = promo?.end_date
    ? new Date(promo.end_date).toLocaleString(ar ? "ar-DZ" : "fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" })
    : null;

  const t = ar
    ? {
      subject: `🎁 درسك المجاني: ${titre}`,
      hello: prenom ? `مرحبًا ${esc(prenom)}،` : "مرحبًا،",
      ready: `درسك المجاني <strong>${esc(titre)}</strong> جاهز. يمكنك مشاهدته متى شئت:`,
      watch: "▶️ شاهدي الدرس",
      pdf: "📄 تحميل الملف PDF",
      more: "تريدين الذهاب أبعد؟",
      moreText: "هذا الدرس هو البداية فقط. اكتشفي تكويناتنا الكاملة، خطوة بخطوة، مع المتابعة والشهادة.",
      cta: page.cta_label || "اكتشفي التكوين الكامل",
      all: "كل تكويناتنا",
      sign: "Arazzo Formation — مدرسة الخياطة، سطيف",
      promo: "🎟️ كود التخفيض الخاص بك:",
      promoPlaces: (n: number) => `بقيت ${n} أماكن فقط بهذا الكود.`,
      promoEnds: (d: string) => `صالح حتى ${d}.`,
      promoHint: "استعمليه عند التسجيل، في خانة « كود التخفيض ».",
    }
    : {
      subject: `🎁 Votre cours gratuit : ${titre}`,
      hello: prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,",
      ready: `Votre cours gratuit <strong>${esc(titre)}</strong> est prêt. Regardez-le quand vous voulez :`,
      watch: "▶️ Regarder le cours",
      pdf: "📄 Télécharger le PDF",
      more: "Envie d’aller plus loin ?",
      moreText: "Ce cours n’est qu’un début. Découvrez nos formations complètes, pas à pas, avec suivi et certificat.",
      cta: page.cta_label || "Découvrir la formation complète",
      all: "Voir toutes nos formations",
      sign: "Arazzo Formation — École de couture, Sétif",
      promo: "🎟️ Votre code promo :",
      promoPlaces: (n: number) => (n <= 1 ? "Plus qu’1 place avec ce code." : `Plus que ${n} places avec ce code.`),
      promoEnds: (d: string) => `Valable jusqu’au ${d}.`,
      promoHint: "Utilisez-le lors de votre inscription, dans la case « code promo ».",
    };

  const dir = ar ? "rtl" : "ltr";
  const html = `
  <div dir="${dir}" style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
        <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;">✂ ARAZZO</div>
        <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
      </div>
      <div style="padding:34px;color:#444;line-height:1.65;font-size:15px;text-align:${ar ? "right" : "left"};">
        <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">🎁 ${esc(titre)}</h2>
        <p style="margin:0 0 10px;">${t.hello}</p>
        ${intro ? `<p style="margin:0 0 10px;">${intro}</p>` : ""}
        <p style="margin:0;">${t.ready}</p>
        ${bouton(t.watch, coursUrl, "#5B16F9")}
        ${pdf ? `<p style="text-align:center;margin:0 0 8px;"><a href="${esc(pdf)}" style="color:#4B3BC7;font-weight:600;">${t.pdf}</a></p>` : ""}
        <div style="margin-top:26px;padding:20px;background:#FDF2E9;border-radius:14px;">
          <h3 style="margin:0 0 8px;color:#2A0880;font-family:Georgia,serif;">${t.more}</h3>
          <p style="margin:0;">${t.moreText}</p>
          ${promo ? `<div style="margin:16px 0 4px;padding:14px;border:2px dashed #E07840;border-radius:12px;background:#fff;text-align:center;">
            <div style="font-weight:700;color:#2A0880;">${t.promo}</div>
            <div dir="ltr" style="font-family:monospace;font-size:24px;font-weight:800;letter-spacing:2px;color:#E07840;margin:6px 0;">${esc(promo.code)}</div>
            ${promo.discount_label ? `<div style="font-weight:700;">${esc(promo.discount_label)}</div>` : ""}
            ${typeof promo.remaining === "number" ? `<div style="color:#B3261E;font-weight:700;margin-top:4px;">⏳ ${t.promoPlaces(promo.remaining)}</div>` : ""}
            ${finPromo ? `<div style="margin-top:4px;">${t.promoEnds(esc(finPromo))}</div>` : ""}
            <div style="font-size:13px;color:#666;margin-top:6px;">${t.promoHint}</div>
          </div>` : ""}
          ${cta ? bouton(esc(t.cta), cta) : ""}
          <p style="text-align:center;margin:${cta ? "0" : "14px 0 0"};"><a href="${SITE}/offres" style="color:#4B3BC7;font-weight:600;">${t.all} →</a></p>
        </div>
        <p style="margin-top:26px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:14px;">${t.sign}</p>
      </div>
      <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">
        <a href="${SITE}" style="color:#4B3BC7;text-decoration:none;">formation-arazzo.store</a>
      </div>
    </div>
  </div>`;
  return { subject: t.subject, html };
}
