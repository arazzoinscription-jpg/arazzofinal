"use client";

/**
 * Landing publique d'une offre présentielle — PORT FIDÈLE d'Arazzo OS.
 *
 * Identique à `apps/web/app/presentiel/[slug]/page.js` de l'OS : bilingue FR/AR
 * (RTL), bandeau serif, carte, CTA orange, jauge de places, formules, dossier,
 * « comment venir », formulaire. Deux seules différences, imposées par
 * l'hébergement 24/7 sur Vercel sans tunnel :
 *
 *   1. Les données ne viennent PAS d'une API OS mais d'un INSTANTANÉ Supabase
 *      (`data`, poussé par le bouton « Synchroniser » de l'OS). Le rafraîchis-
 *      sement auto relit cet instantané.
 *   2. Le formulaire n'appelle pas l'OS : il écrit un PROSPECT dans Supabase
 *      (server action), que l'OS rapatrie ensuite dans son CRM.
 *
 * Le style vit dans `@/lib/landing-kit` (namespace « pl- »), porté verbatim.
 */

import { useEffect, useState } from "react";
import { LandingStyles, SeatsBanner, utmDeLURL, type Seats } from "@/lib/landing-kit";
import { submitPresentielLead } from "@/app/actions/presentiel-lead";

type OfferView = Record<string, any>;

const CLE_LANGUE = "arazzo_presentiel_langue";

/** Les mots de l'interface, dans les deux langues (identiques à l'OS). */
const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl",
    formation: "تكوين", atelier: "ورشة",
    eyebrowF: "🎓 تكوين حضوري", eyebrowA: "🧵 ورشة حضورية",
    sessions: (n: number) => `🎓 ${n} حصة`,
    programTitle: "البرنامج المفصّل", programSub: "البرنامج كامل، وحدة بوحدة",
    onlineTitle: "أفضّل التكوين عن بُعد", onlineSub: "نفس التكوين، من المنزل",
    comingH2: "كيفية الوصول إلى المركز",
    maps: "🗺️ افتحي في خرائط قوقل", video: "▶️ فيديو: الطريق بالضبط",
    interested: "أنا مهتمة",
    seatsTitle: "أماكن المجموعة القادمة",
    placesLeft: (n: number) => (n <= 0 ? "اكتمل العدد" : `بقيت ${n} أماكن فقط!`),
    seatsFull: "اكتمل العدد — قائمة الانتظار", takeSeat: "أحجز مكاني",
    groupN: (n: number) => `المجموعة ${n}`,
    sentBadge: "✓ تم إرسال طلبك — سنتصل بك عبر واتساب لتأكيد مكانك.",
    interestedCount: (n: number) => `${n} مهتمة حاليًا`,
    fName: "الاسم", fPhone: "رقم واتساب", fEmail: "البريد الإلكتروني", optional: "(اختياري)", fCity: "المدينة",
    phName: "اسمك", phPhone: "0X XX XX XX XX", phEmail: "you@example.com", phCity: "سطيف",
    slotsLegend: "ما هي الأيام التي يمكنك الحضور فيها؟",
    slotsHint: "اختاري كل الأوقات المناسبة لك — سنعتمد اليوم الأكثر طلبًا.",
    formulaLegend: "اختاري طريقة الدراسة (المدة، التوقيت والسعر)",
    pricingTitle: "الأسعار والتوقيت", perMonth: "/ الشهر", priceFrom: "ابتداءً من",
    importantTitle: "⭐ ملاحظة مهمة",
    send: "إرسال…",
    note: "هذا ليس تسجيلاً نهائيًا بعد. سنتصل بك عبر واتساب لتأكيد مكانك واليوم المعتمد للمجموعة.",
    consent: "أوافق على أن يتم التواصل معي من طرف Arazzo Formation بخصوص تسجيلي.",
    errConsent: "يرجى الموافقة لكي نتمكن من التواصل معك.",
    errDays: (n: number) => `هذه الطريقة مكثّفة (${n} أيام في الأسبوع): يرجى اختيار ${n} أيام على الأقل من المواعيد.`,
    errValidation: "يرجى إدخال اسمك ورقم واتساب.",
    errGeneric: "تعذّر الإرسال.",
    merciTitle: "شكرًا لك! تم التسجيل.",
    merciNote: "سنتصل بك عبر واتساب حالما تكتمل المجموعة، لتأكيد مكانك واليوم المعتمد.",
    merciMap: "🗺️ حدّدي موقع المركز في انتظار ذلك",
    pied: "Arazzo · مدرسة الخياطة — سطيف",
    closed: "هذا التكوين غير مفتوح حاليًا.",
    toggle: "Français",
  },
  fr: {
    dir: "ltr",
    formation: "Formation", atelier: "Atelier",
    eyebrowF: "🎓 Formation présentielle", eyebrowA: "🧵 Atelier présentiel",
    sessions: (n: number) => `🎓 ${n} séances`,
    programTitle: "Programme détaillé", programSub: "Le programme complet, module par module",
    onlineTitle: "Je préfère en ligne", onlineSub: "La même formation, à distance",
    comingH2: "Comment venir au centre",
    maps: "🗺️ Ouvrir dans Google Maps", video: "▶️ Vidéo : le trajet exact",
    interested: "Je suis intéressée",
    seatsTitle: "Places du prochain groupe",
    placesLeft: (n: number) => (n <= 0 ? "Complet" : `Plus que ${n} place${n > 1 ? "s" : ""} !`),
    seatsFull: "Complet — liste d’attente", takeSeat: "Je prends ma place",
    groupN: (n: number) => `Groupe ${n}`,
    sentBadge: "✓ Votre demande est envoyée — on vous appelle pour confirmer votre place.",
    interestedCount: (n: number) => `${n} intéressée${n > 1 ? "s" : ""} en ce moment`,
    fName: "Prénom", fPhone: "WhatsApp", fEmail: "E-mail", optional: "(optionnel)", fCity: "Ville",
    phName: "Votre prénom", phPhone: "0X XX XX XX XX", phEmail: "vous@exemple.com", phCity: "Sétif",
    slotsLegend: "Quels jours pouvez-vous venir ?",
    slotsHint: "Cochez tous les créneaux qui vous conviennent — on retiendra le plus demandé.",
    formulaLegend: "Choisissez votre méthode de cours (durée, horaires & prix)",
    pricingTitle: "Tarifs & horaires", perMonth: "/ mois", priceFrom: "À partir de",
    importantTitle: "⭐ À noter",
    send: "Envoi…",
    note: "Ce n’est pas encore une inscription : nous vous rappellerons sur WhatsApp pour confirmer votre place et le créneau retenu.",
    consent: "J’accepte d’être recontactée par Arazzo Formation au sujet de mon inscription.",
    errConsent: "Merci de cocher la case pour qu’on puisse vous recontacter.",
    errDays: (n: number) => `Cette méthode est accélérée (${n}×/semaine) : merci de choisir au moins ${n} jours dans les créneaux.`,
    errValidation: "Merci d’indiquer votre prénom et votre numéro WhatsApp.",
    errGeneric: "Envoi impossible.",
    merciTitle: "Merci ! C’est bien noté.",
    merciNote: "Nous vous rappellerons sur WhatsApp dès que le groupe sera constitué, pour confirmer votre place et le jour retenu.",
    merciMap: "🗺️ Repérer le centre en attendant",
    pied: "Arazzo · École de couture — Sétif",
    closed: "Cette offre n’est pas ouverte pour le moment.",
    toggle: "العربية",
  },
};

const JOUR_AR: Record<string, string> = {
  samedi: "السبت", dimanche: "الأحد", lundi: "الإثنين", mardi: "الثلاثاء",
  mercredi: "الأربعاء", jeudi: "الخميس", vendredi: "الجمعة",
};
const PERIODE_AR: Record<string, string> = { matin: "صباحًا", "apres-midi": "بعد الظهر", soir: "مساءً" };
const PERIODE_FR: Record<string, string> = { matin: "matin", "apres-midi": "après-midi", soir: "soir" };

function slotLabelAr(id: string) {
  const s = String(id ?? "");
  for (const p of ["matin", "apres-midi", "soir"]) {
    if (s.endsWith(`-${p}`)) {
      const jour = s.slice(0, s.length - p.length - 1);
      return `${JOUR_AR[jour] ?? jour} ${PERIODE_AR[p] ?? p}`;
    }
  }
  return JOUR_AR[s] ?? s;
}

function groupeLisible(group: any, langue: "ar" | "fr") {
  if (!group) return null;
  const ar = langue === "ar";
  const parts: string[] = [];
  const slot = group.slot ?? (group.day && group.period ? `${group.day}-${group.period}` : null);
  if (ar && slot) {
    parts.push(slotLabelAr(slot));
  } else if (group.day || group.period) {
    const jour = group.day ?? "";
    const moment = group.period ? (PERIODE_FR[group.period] ?? group.period) : "";
    parts.push(`${jour} ${moment}`.trim());
  }
  if (group.duration_label) parts.push(group.duration_label);
  const detail = parts.filter(Boolean).join(" · ");
  if (!detail) return null;
  const tete = ar ? "المجموعة الجاري تكوينها:" : "Groupe en cours :";
  return `${tete} ${detail}`;
}

/** Coupe le dernier mot du titre pour le mettre en italique orange (façon Arazzo). */
function titreAvecAccent(nom: string) {
  const mots = String(nom ?? "").trim().split(/\s+/);
  if (mots.length < 2) return { debut: "", fin: nom ?? "" };
  return { debut: mots.slice(0, -1).join(" "), fin: mots[mots.length - 1] };
}

const cssVar = (k: string, v: string) => ({ [k]: v }) as React.CSSProperties;

export default function PresentielLanding({ data }: { data: OfferView }) {
  const [langue, setLangue] = useState<"ar" | "fr">("ar");
  const [def, setDef] = useState<OfferView>(data);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState<"form" | "done">("form");
  const [valeurs, setValeurs] = useState({ first_name: "", phone: "", email: "", city: "" });
  const [creneaux, setCreneaux] = useState<string[]>([]);
  const [formule, setFormule] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [dejaEnvoye, setDejaEnvoye] = useState(false);
  const [accepte, setAccepte] = useState(false);

  const slug = String(def.slug ?? "");

  // Langue mémorisée (défaut arabe : le public de l'école est arabophone).
  useEffect(() => {
    try {
      const gardee = window.localStorage.getItem(CLE_LANGUE);
      if (gardee === "fr" || gardee === "ar") setLangue(gardee);
    } catch { /* stockage indisponible : on reste sur l'arabe */ }
  }, []);

  // Pré-sélectionne la première formule proposée (si l'offre en a).
  useEffect(() => {
    if (Array.isArray(def.formulas) && def.formulas.length) setFormule(def.formulas[0].id);
    setValeurs((s) => ({ ...s, city: def.city ?? "Sétif" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changerLangue() {
    setLangue((l) => {
      const suite = l === "ar" ? "fr" : "ar";
      try { window.localStorage.setItem(CLE_LANGUE, suite); } catch { /* ignore */ }
      return suite;
    });
  }

  const t = T[langue];

  // Ce visiteur a-t-il déjà envoyé sa demande pour cette offre ?
  useEffect(() => {
    try { if (window.localStorage.getItem(`presentiel_sent_${slug}`)) setDejaEnvoye(true); } catch { /* ignore */ }
  }, [slug]);

  // Rafraîchit la jauge de places toute seule : relit l'instantané Supabase. Le
  // compteur baisse dès que l'école re-synchronise après avoir confirmé quelqu'un.
  useEffect(() => {
    if (!slug) return undefined;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/presentiel-snapshot?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (d && typeof d === "object") {
          setDef((prev) => ({ ...prev, seats: d.seats, groups_open: d.groups_open }));
        }
      } catch { /* une lecture ratée ne casse pas la page */ }
    }, 25_000);
    return () => clearInterval(id);
  }, [slug]);

  function set(k: string, v: string) { setValeurs((s) => ({ ...s, [k]: v })); }
  function basculerCreneau(id: string) {
    setCreneaux((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!accepte) { setErreur(t.errConsent); return; }
    // Méthode accélérée (2×/semaine) → obliger le choix d'au moins 2 jours.
    const fo = (def.formulas ?? []).find((f: any) => f.id === formule);
    const txt = `${fo?.label ?? ""} ${fo?.schedule_label ?? ""}`.toLowerCase();
    const m = txt.match(/(\d)\s*(?:fois|x|×|\/)\s*(?:par\s*)?(?:semaine|sem|أسبوع|مرات)/);
    const requiredDays = m ? parseInt(m[1], 10) : (/(accél|مكثّ?ف)/.test(txt) ? 2 : 0);
    if (requiredDays > 1 && creneaux.length < requiredDays) {
      setErreur(t.errDays(requiredDays));
      return;
    }
    setEnvoi(true);
    try {
      const res = await submitPresentielLead({
        slug,
        offer: def.name,
        first_name: valeurs.first_name.trim(),
        phone: valeurs.phone.trim(),
        email: valeurs.email.trim() || undefined,
        city: valeurs.city.trim() || undefined,
        availabilities: creneaux,
        formula_id: formule ?? undefined,
        consent: true,
        lang: langue,
        utm: utmDeLURL(),
      });
      if (!res.ok) {
        setErreur(res.error === "validation_failed" ? t.errValidation : (res.error || t.errGeneric));
        return;
      }
      try { window.localStorage.setItem(`presentiel_sent_${slug}`, "1"); } catch { /* ignore */ }
      setDejaEnvoye(true);
      setEtape("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErreur(err?.message ?? t.errGeneric);
    } finally { setEnvoi(false); }
  }

  const estAtelier = def.kind === "atelier";
  const nomAffiche = (langue === "ar" && def.name_ar) ? def.name_ar : def.name;
  const { debut, fin } = titreAvecAccent(nomAffiche);
  const center = def.center ?? {};
  // Lien vers la version EN LIGNE : ce que l'école a collé, sinon déduit du niveau.
  const onlineUrl = def.online_url || (def.level ? `/formation/${def.level}` : null);

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />

      {/* Bascule de langue — toujours accessible, en haut. */}
      <button type="button" className="pl-langue" onClick={changerLangue} aria-label={t.toggle}>
        🌐 {t.toggle}
      </button>

      {/* ---------------------------------------------------- Bandeau (hero) --- */}
      <header className="pl-hero">
        <div className="pl-hero-in">
          <div className="pl-marque">
            <a href="/offres" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pl-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
              <span className="pl-marque-nom">Arazzo <em>{estAtelier ? t.atelier : t.formation}</em></span>
            </a>
          </div>
          <span className="pl-eyebrow">
            {estAtelier ? t.eyebrowA : t.eyebrowF} · {def.city ?? "Sétif"}
          </span>
          <h1 className="pl-titre">
            {debut ? <>{debut} </> : null}<em>{fin}</em>
          </h1>
          {def.tagline ? <p className="pl-tagline">{def.tagline}</p> : null}
          <div className="pl-specs">
            <span className="pl-spec">📍 {def.city ?? "Sétif"}</span>
            {def.duration_label ? <span className="pl-spec">⏱️ {def.duration_label}</span> : null}
            {!estAtelier && def.sessions_count
              ? <span className="pl-spec">{t.sessions(def.sessions_count)}</span> : null}
            {def.model ? <span className="pl-spec">✂️ {def.model}</span> : null}
            {def.session_label ? <span className="pl-spec">🗓️ {def.session_label}</span> : null}
            {def.formulas?.length
              ? <span className="pl-spec pl-spec-prix">💰 {def.formulas.length} formules ↓</span>
              : (def.price_month != null
                ? <span className="pl-spec pl-spec-prix">💰 {Number(def.price_month).toLocaleString(langue === "ar" ? "ar-DZ" : "fr-FR")} {def.price_currency ?? "DZD"} {t.perMonth}</span>
                : null)}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- Contenu --- */}
      <div className="pl-wrap">
        <div className="pl-card">
          {/* Jauge de places : visible en permanence (formulaire ET après envoi).
              Plusieurs groupes en constitution → affichés CÔTE À CÔTE. */}
          {(() => {
            const versLeForm = () => {
              const el = document.getElementById("pl-form");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            };
            const ouverts: any[] = def.groups_open ?? [];
            if (ouverts.length > 1) {
              return (
                <div className="pl-groupes-duo">
                  {ouverts.map((gs, i) => (
                    <div key={gs.id}>
                      <div style={{ fontWeight: 800, color: "var(--violet-deep)", margin: "0 0 6px", fontSize: ".9rem" }}>
                        {t.groupN(i + 1)}
                      </div>
                      <SeatsBanner
                        seats={gs as Seats} t={t} sent={dejaEnvoye}
                        groupInfo={groupeLisible(gs.group, langue)}
                        onTake={versLeForm}
                      />
                    </div>
                  ))}
                </div>
              );
            }
            const seul = ouverts[0] ?? def.seats;
            return seul ? (
              <SeatsBanner
                seats={seul as Seats} t={t} sent={dejaEnvoye}
                groupInfo={seul.group_open ? groupeLisible(seul.group, langue) : null}
                onTake={versLeForm}
              />
            ) : null;
          })()}

          {etape === "form" && (
            <>
              {def.description ? (
                <p className="pl-lede" style={cssVar("--d", ".05s")}>{def.description}</p>
              ) : null}

              {/* Dossier obligatoire — alerte rouge, s'ouvre au clic. */}
              <details className="pl-acc pl-acc-alert" style={cssVar("--d", ".08s")}>
                <summary>📌 {langue === "ar" ? "ملف مطلوب عند التسجيل بالمركز" : "Dossier obligatoire au centre"}</summary>
                <div className="pl-acc-body pl-rtl-block" dir="rtl">
                  <p><strong>الملف الإجباري للتسجيل في المركز</strong></p>
                  <p>يُشترط على كل متربصة إيداع ملف التسجيل كاملاً لدى مركز التكوين. ولا يُعتبر التسجيل نهائياً إلا بعد استلام الملف كاملاً والمصادقة عليه من طرف إدارة المركز.</p>
                  <div className="pl-line"><span>Copie de la pièce d’identité · نسخة من بطاقة التعريف الوطنية</span></div>
                  <div className="pl-line"><span>1 photo d’identité · صورة واحدة شمسية</span></div>
                  <div className="pl-line"><span>Frais d’inscription · حقوق التسجيل</span><b>500 DA</b></div>
                </div>
              </details>

              {/* Services additionnels — option en plus, s'ouvre au clic. */}
              <details className="pl-acc" style={cssVar("--d", ".09s")}>
                <summary>➕ {langue === "ar" ? "خدمات إضافية (اختياري)" : "En plus (options)"} · خدمات إضافية</summary>
                <div className="pl-acc-body">
                  <div className="pl-line"><span>Pack vidéos de finition (accès à vie, plateforme)</span><b>4 000 DA</b></div>
                  <div className="pl-line"><span>Séance spéciale : machine à coudre</span><b>2 000 DA</b></div>
                  <div className="pl-line"><span>Atelier spécialisé (modèle/design précis) — par séance</span><b>1 500–2 500 DA</b></div>
                  <p className="pl-acc-note">⭐ {langue === "ar" ? "حسب اختياراتكم" : "Selon vos choix"}</p>
                </div>
              </details>

              {/* Tarifs & horaires — quand l'offre a UN seul prix (pas de formules). */}
              {!def.formulas?.length && (def.price_month != null || def.schedule_label || def.duration_label) ? (
                <section className="pl-section" style={cssVar("--d", ".08s")}>
                  <h2 className="pl-h2">{t.pricingTitle}</h2>
                  <div className="pl-tarif">
                    {def.price_month != null ? (
                      <div className="pl-tarif-prix">
                        {Number(def.price_month).toLocaleString(langue === "ar" ? "ar-DZ" : "fr-FR")} {def.price_currency ?? "DZD"}
                        <span> {t.perMonth}</span>
                      </div>
                    ) : null}
                    <ul className="pl-check-list" style={{ marginTop: def.price_month != null ? 10 : 0 }}>
                      {def.duration_label ? <li>⏱️ {def.duration_label}</li> : null}
                      {def.schedule_label ? <li>🕐 {def.schedule_label}</li> : null}
                      {!estAtelier && def.sessions_count ? <li>🎓 {def.sessions_count} séances</li> : null}
                    </ul>
                  </div>
                </section>
              ) : null}

              {/* Formules au choix (2 horaires/prix selon le groupe). */}
              {def.formulas?.length ? (
                <section className="pl-section" style={cssVar("--d", ".08s")}>
                  <h2 className="pl-h2">{t.formulaLegend}</h2>
                  <div className="pl-formules">
                    {def.formulas.map((fo: any) => {
                      const on = formule === fo.id;
                      return (
                        <button type="button" key={fo.id} className="pl-formule" data-on={on ? "true" : undefined}
                          onClick={() => setFormule(fo.id)} aria-pressed={on}>
                          <span className="pl-formule-tick" aria-hidden="true">{on ? "✓" : ""}</span>
                          <span className="pl-formule-corps">
                            <strong>{fo.label}</strong>
                            <span className="pl-formule-meta">
                              {[fo.session_duration, fo.duration_label, fo.schedule_label].filter(Boolean).join(" · ")}
                            </span>
                            {fo.price_label ? <span className="pl-formule-prix">{fo.price_label}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {/* Note importante (atelier d'un modèle, prix selon l'atelier…). */}
              {def.important_note ? (
                <div className="pl-dossier" style={{ ...cssVar("--d", ".12s"), background: "color-mix(in srgb, var(--thread) 7%, var(--panel))", borderColor: "color-mix(in srgb, var(--thread) 30%, transparent)" }}>
                  <div className="pl-dossier-tete" style={{ color: "var(--violet-deep)" }}>{t.importantTitle}</div>
                  <p>{def.important_note}</p>
                </div>
              ) : null}

              {/* Programme (site LMS) + bascule vers l'en ligne. */}
              {def.program_url || onlineUrl ? (
                <div className="pl-actions" style={cssVar("--d", ".1s")}>
                  {def.program_url ? (
                    <a className="pl-ghost" href={def.program_url} target="_blank" rel="noreferrer">
                      <span className="pl-ghost-ico">📋</span>
                      <span>
                        <strong>{t.programTitle}</strong>
                        <small>{t.programSub}</small>
                      </span>
                    </a>
                  ) : null}
                  {onlineUrl ? (
                    <a className="pl-ghost pl-ghost-alt" href={onlineUrl}>
                      <span className="pl-ghost-ico">🌐</span>
                      <span>
                        <strong>{t.onlineTitle}</strong>
                        <small>{t.onlineSub}</small>
                      </span>
                    </a>
                  ) : null}
                </div>
              ) : null}

              {/* Comment venir : adresse + Maps + vidéo du trajet. */}
              {center.address || center.maps_url || center.location_video_url ? (
                <section className="pl-section" style={cssVar("--d", ".2s")}>
                  <h2 className="pl-h2">{t.comingH2}</h2>
                  {center.address ? <p className="pl-adresse">{center.address}</p> : null}
                  <div className="pl-map-actions">
                    {center.maps_url ? (
                      <a className="pl-map-btn" href={center.maps_url} target="_blank" rel="noreferrer">{t.maps}</a>
                    ) : null}
                    {center.location_video_url ? (
                      <a className="pl-map-btn pl-map-btn-video" href={center.location_video_url} target="_blank" rel="noreferrer">{t.video}</a>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {/* Formulaire. */}
              <form id="pl-form" className="pl-form" onSubmit={envoyer} style={cssVar("--d", ".25s")}>
                <h2 className="pl-h2">{def.cta_label || t.interested}</h2>

                <div className="pl-fields">
                  <label className="pl-field">
                    <span>{t.fName}</span>
                    <input value={valeurs.first_name} required
                      onChange={(e) => set("first_name", e.target.value)} placeholder={t.phName} />
                  </label>
                  <label className="pl-field">
                    <span>{t.fPhone}</span>
                    <input type="tel" value={valeurs.phone} required
                      onChange={(e) => set("phone", e.target.value)} placeholder={t.phPhone} />
                  </label>
                  <label className="pl-field">
                    <span>{t.fEmail} <em>{t.optional}</em></span>
                    <input type="email" value={valeurs.email}
                      onChange={(e) => set("email", e.target.value)} placeholder={t.phEmail} />
                  </label>
                  <label className="pl-field">
                    <span>{t.fCity}</span>
                    <input value={valeurs.city}
                      onChange={(e) => set("city", e.target.value)} placeholder={t.phCity} />
                  </label>
                </div>

                {def.availability_slots?.length ? (
                  <fieldset className="pl-slots-box">
                    <legend>{t.slotsLegend}</legend>
                    <p className="pl-slots-hint">{t.slotsHint}</p>
                    <div className="pl-slots">
                      {def.availability_slots.map((slot: any) => {
                        const on = creneaux.includes(slot.id);
                        const label = langue === "ar" ? slotLabelAr(slot.id) : slot.label;
                        return (
                          <button type="button" key={slot.id} className="pl-slot" data-on={on ? "true" : undefined}
                            onClick={() => basculerCreneau(slot.id)} aria-pressed={on}>
                            <span className="pl-slot-tick" aria-hidden="true">{on ? "✓" : ""}</span>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <label className="pl-consent">
                  <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                  <span>{t.consent}</span>
                </label>
                {erreur ? <div className="pl-erreur">{erreur}</div> : null}
                <button type="submit" className="pl-cta" disabled={envoi}>
                  {envoi ? t.send : (def.cta_label || t.interested)}
                </button>
                <p className="pl-note">{t.note}</p>
              </form>
            </>
          )}

          {etape === "done" && (
            <div className="pl-merci">
              <div className="pl-check">✓</div>
              <h1 className="pl-titre pl-titre-dark">{t.merciTitle}</h1>
              <p>{langue === "ar"
                ? <>أنتِ الآن مسجّلة كمهتمة بـ <strong>{nomAffiche}</strong>.</>
                : <>Vous êtes enregistrée comme intéressée par <strong>{nomAffiche}</strong>.</>}</p>
              <p className="pl-note">{t.merciNote}</p>
              {center.maps_url ? (
                <a className="pl-map-btn" href={center.maps_url} target="_blank" rel="noreferrer" style={{ marginTop: 16 }}>
                  {t.merciMap}
                </a>
              ) : null}
            </div>
          )}
        </div>

        <p className="pl-pied">{t.pied}</p>
      </div>
    </div>
  );
}
