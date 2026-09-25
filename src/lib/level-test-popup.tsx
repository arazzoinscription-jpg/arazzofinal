"use client";

/**
 * Popup du TEST DE NIVEAU — même esprit que l'OS. Récupère les questions du test
 * poussé par l'OS (`/api/level-test`), les affiche, calcule le résultat côté
 * serveur (server action `submitLevelTest`) et enregistre le passage (→ rapatrié
 * dans le CRM de l'OS au clic « Synchroniser »).
 *
 * Réutilise les styles `pl-modal` / `pl-*` du kit de landing (déjà chargés par la
 * page hôte via <LandingStyles/>). Bilingue via la prop `langue`.
 */

import { useEffect, useState } from "react";
import { submitLevelTest } from "@/app/actions/level-test";

type PublicQuestion = {
  key: string; kind: string; q: string; description?: string | null;
  required?: boolean; options: { value: string | number; label: string }[];
};
type PublicTest = {
  slug: string; title?: string | null; subtitle?: string | null;
  description?: string | null; language?: string; dir?: string;
  questions: PublicQuestion[];
};

const T: Record<"ar" | "fr", any> = {
  ar: {
    title: "اختبار المستوى", close: "إغلاق",
    intro: "أجيبي على الأسئلة، ثم اتركي معلوماتك لتصلك نتيجتك والتكوين المناسب.",
    contactTitle: "معلوماتك (لاستلام النتيجة)",
    fName: "الاسم", fEmail: "البريد الإلكتروني", fPhone: "رقم واتساب", optional: "(اختياري)",
    phName: "اسمك", phEmail: "you@example.com", phPhone: "0X XX XX XX XX",
    submit: "شوفي نتيجتي", submitting: "جارٍ الحساب…",
    resultTitle: "نتيجتك", iSubscribe: "أريد التسجيل", restart: "إعادة الاختبار",
    errRequired: "يرجى الإجابة على كل الأسئلة.",
    errContact: "يرجى إدخال بريدك الإلكتروني أو رقم واتساب لتصلك نتيجتك.",
    errGeneric: "تعذّر الحساب. حاولي مرة أخرى.",
    loading: "جارٍ التحميل…", unavailable: "الاختبار غير متاح حاليًا.",
  },
  fr: {
    title: "Test de niveau", close: "Fermer",
    intro: "Répondez aux questions, puis laissez vos coordonnées pour recevoir votre résultat et la formation adaptée.",
    contactTitle: "Vos coordonnées (pour recevoir votre résultat)",
    fName: "Prénom", fEmail: "E-mail", fPhone: "WhatsApp", optional: "(optionnel)",
    phName: "Votre prénom", phEmail: "vous@exemple.com", phPhone: "0X XX XX XX XX",
    submit: "Voir mon résultat", submitting: "Calcul…",
    resultTitle: "Votre résultat", iSubscribe: "Je m’inscris", restart: "Refaire le test",
    errRequired: "Merci de répondre à toutes les questions.",
    errContact: "Merci d’indiquer votre e-mail ou votre WhatsApp pour recevoir votre résultat.",
    errGeneric: "Calcul impossible. Réessayez.",
    loading: "Chargement…", unavailable: "Le test n’est pas disponible pour le moment.",
  },
};

export default function LevelTestPopup({
  slug, langue, utm, onClose, onSubscribe,
}: {
  slug: string;
  langue: "ar" | "fr";
  utm?: Record<string, string>;
  onClose: () => void;
  onSubscribe?: () => void;
}) {
  const t = T[langue];
  const [test, setTest] = useState<PublicTest | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ first_name: "", email: "", phone: "" });
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const r = await fetch(`/api/level-test?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!r.ok) { if (vivant) setErreur("unavailable"); return; }
        const d = await r.json();
        if (vivant) setTest(d);
      } catch { if (vivant) setErreur("unavailable"); }
    })();
    return () => { vivant = false; };
  }, [slug]);

  async function envoyer() {
    if (!test) return;
    setErreur(null);
    const manquantes = test.questions.filter((q) => q.required !== false && !answers[q.key]);
    if (manquantes.length) { setErreur(t.errRequired); return; }
    if (!contact.email.trim() && !contact.phone.trim()) { setErreur(t.errContact); return; }
    setEnvoi(true);
    try {
      const res = await submitLevelTest({
        slug, answers, lang: langue, utm: utm && Object.keys(utm).length ? utm : undefined,
        contact: {
          first_name: contact.first_name.trim() || undefined,
          email: contact.email.trim() || undefined,
          phone: contact.phone.trim() || undefined,
        },
      });
      if (!res.ok) { setErreur(t.errGeneric); return; }
      setResultat(res.result);
    } catch { setErreur(t.errGeneric); } finally { setEnvoi(false); }
  }

  return (
    <div className="pl-modal" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pl-modal-box" dir={t.title && langue === "ar" ? "rtl" : "ltr"}>
        <div className="pl-modal-tete">
          <h2 className="pl-h2" style={{ margin: 0 }}>{test?.title || t.title}</h2>
          <button type="button" className="pl-modal-x" onClick={onClose} aria-label={t.close}>✕</button>
        </div>

        {/* Erreur de chargement / indisponible. */}
        {erreur === "unavailable" ? (
          <p className="pl-lede" style={{ margin: 0 }}>{t.unavailable}</p>
        ) : !test ? (
          <p className="pl-lede" style={{ margin: 0 }}>{t.loading}</p>
        ) : resultat ? (
          /* ------------------------------------------------------ Résultat --- */
          <div className="pl-merci" style={{ paddingTop: 0 }}>
            <div className="pl-check" aria-hidden="true">🎯</div>
            <h1 className="pl-titre pl-titre-dark" style={{ fontSize: "1.6rem" }}>{t.resultTitle}</h1>
            {resultat.level_label ? (
              <p style={{ fontWeight: 800, color: "var(--violet-deep)", fontSize: "1.15rem", margin: "6px 0" }}>
                {resultat.level_label}
              </p>
            ) : null}
            {resultat.explanation ? <p>{resultat.explanation}</p> : null}
            {resultat.recommendation?.course_url ? (
              <a className="pl-cta" href={resultat.recommendation.course_url}
                style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
                {t.iSubscribe}
              </a>
            ) : (
              <button type="button" className="pl-cta" style={{ marginTop: 16 }}
                onClick={() => { onClose(); onSubscribe?.(); }}>
                {t.iSubscribe}
              </button>
            )}
          </div>
        ) : (
          /* ------------------------------------------------------ Questions --- */
          <div>
            <p className="pl-lede" style={{ margin: "0 0 14px" }}>{test.description || t.intro}</p>

            {test.questions.map((q, i) => (
              <fieldset key={q.key} className="pl-slots-box" style={{ margin: "0 0 18px" }}>
                <legend>{i + 1}. {q.q}</legend>
                {q.description ? <p className="pl-slots-hint">{q.description}</p> : null}
                <div className="pl-slots">
                  {q.options.map((o) => {
                    const on = String(answers[q.key]) === String(o.value);
                    return (
                      <button type="button" key={String(o.value)} className="pl-slot" data-on={on ? "true" : undefined}
                        onClick={() => setAnswers((a) => ({ ...a, [q.key]: String(o.value) }))} aria-pressed={on}>
                        <span className="pl-slot-tick" aria-hidden="true">{on ? "✓" : ""}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {/* Coordonnées. */}
            <h3 className="pl-h2" style={{ fontSize: "1.1rem" }}>{t.contactTitle}</h3>
            <div className="pl-fields">
              <label className="pl-field pl-field-full">
                <span>{t.fName} <em>{t.optional}</em></span>
                <input value={contact.first_name} placeholder={t.phName}
                  onChange={(e) => setContact((c) => ({ ...c, first_name: e.target.value }))} />
              </label>
              <label className="pl-field">
                <span>{t.fEmail}</span>
                <input type="email" value={contact.email} placeholder={t.phEmail}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
              </label>
              <label className="pl-field">
                <span>{t.fPhone}</span>
                <input type="tel" value={contact.phone} placeholder={t.phPhone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
              </label>
            </div>

            {erreur && erreur !== "unavailable" ? <div className="pl-erreur">{erreur}</div> : null}
            <button type="button" className="pl-cta" disabled={envoi} onClick={envoyer}>
              {envoi ? t.submitting : t.submit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
