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
