"use client";

/**
 * Popup du TEST DE NIVEAU — le MÊME parcours que la page de test d'Arazzo OS
 * (`/tests/[slug]`) :
 *
 *   1. une question à la fois, barre de progression, « Précédent / Suivant » ;
 *   2. un écran « Recevez votre résultat » : coordonnées FACULTATIVES + case de
 *      consentement (texte réglé dans l'OS) ;
 *   3. le résultat : niveau, explication, compétences en %, bouton « Découvrir
 *      la formation » vers la page d'inscription EXACTE du niveau, et — si la
 *      personne n'a jamais utilisé de machine — l'atelier présentiel dédié.
 *
 * Les questions viennent de l'instantané poussé par l'OS (`/api/level-test`) ;
 * le calcul se fait côté serveur (`submitLevelTest`), qui ramène aussi les liens
 * d'inscription sur le site lui-même. Le passage est rapatrié dans le CRM de
 * l'OS au clic « Synchroniser ».
 *
 * Réutilise les styles `pl-modal` / `pl-*` du kit de landing (chargés par la page
 * hôte via <LandingStyles/>). Bilingue via la prop `langue`.
 */

import { useEffect, useRef, useState } from "react";
import { submitLevelTest } from "@/app/actions/level-test";
import { pixelEvent, pixelCustom } from "@/lib/pixel-events";

type PublicQuestion = {
  key: string; kind: string; q: string; description?: string | null;
  required?: boolean; options: { value: string | number; label: string }[];
};
type PublicTest = {
  slug: string; title?: string | null; subtitle?: string | null;
  description?: string | null; language?: string; dir?: string;
  consent_text?: string | null;
  questions: PublicQuestion[];
};

/** L'atelier proposé à celles qui n'ont jamais utilisé de machine (comme l'OS). */
const ATELIER_MACHINE = "/presentiel/utilisation-machine-a-coudre-point-droite";

const T: Record<"ar" | "fr", any> = {
  ar: {
    title: "اختبار المستوى", close: "إغلاق",
    question: (i: number, n: number) => `السؤال ${i} / ${n}`, almost: "تقريبًا انتهيتِ",
    prev: "→ السابق", next: "التالي", cont: "متابعة",
    contactTitle: "استلمي نتيجتك",
    contactText: "اتركي معلوماتك لتصلك نتيجتك والتكوين المناسب لك. هذا اختياري — يمكنك رؤية النتيجة بدونه.",
    phName: "الاسم", phEmail: "البريد الإلكتروني", phPhone: "رقم واتساب",
    consent: "أوافق على استلام نتيجتي ونصائح عبر البريد الإلكتروني.",
    submit: "شوفي نتيجتي", submitting: "جارٍ الحساب…",
    privacy: "معلوماتك تبقى سرية وتُستعمل فقط للتواصل معك.",
    resultTitle: "نتيجتك", discover: "اكتشفي التكوين",
    modeTitle: "كيف تريدين متابعة التكوين؟",
    modeOnline: "🖥️ عبر الإنترنت — على المنصّة", modeOnlineSub: "دخول فوري، بإيقاعك الخاص",
    modePresentiel: "🏫 حضوريًا في سطيف", modePresentielSub: "الهضاب، مقابل الجامعة",
    modePick: "↑ اختاري طريقة المتابعة لعرض كيفية التسجيل.",
    discoverOnline: "التسجيل عبر الإنترنت", discoverPresentiel: "التسجيل حضوريًا",
    atelierText: "لا تُتقنين بعدُ استعمال ماكينة الخياطة؟ ننصحكِ بورشة حضورية.",
    atelierBtn: "🧵 ورشة: استعمال ماكينة الخياطة",
    restart: "إعادة الاختبار",
    errRequired: "يرجى الإجابة على كل الأسئلة.",
    errGeneric: "تعذّر الحساب. حاولي مرة أخرى.",
    loading: "جارٍ التحميل…", unavailable: "الاختبار غير متاح حاليًا.",
  },
  fr: {
    title: "Test de niveau", close: "Fermer",
    question: (i: number, n: number) => `Question ${i} / ${n}`, almost: "Presque fini",
    prev: "← Précédent", next: "Suivant", cont: "Continuer",
    contactTitle: "Recevez votre résultat",
    contactText: "Laissez vos coordonnées pour recevoir votre niveau et la formation recommandée. C’est facultatif — vous pouvez voir votre résultat sans.",
    phName: "Prénom", phEmail: "E-mail", phPhone: "Téléphone",
    consent: "J’accepte de recevoir mon résultat et des conseils par e-mail.",
    submit: "Voir mon résultat", submitting: "Calcul…",
    privacy: "Vos informations restent privées et servent à vous recontacter.",
    resultTitle: "Votre résultat", discover: "Découvrir la formation",
    modeTitle: "Comment souhaitez-vous suivre la formation ?",
    modeOnline: "🖥️ En ligne — sur la plateforme", modeOnlineSub: "Accès immédiat, à votre rythme",
    modePresentiel: "🏫 En présentiel à Sétif", modePresentielSub: "El Hidhab, face à l’université",
    modePick: "↑ Choisissez comment suivre la formation pour voir comment vous inscrire.",
    discoverOnline: "M’inscrire en ligne", discoverPresentiel: "M’inscrire en présentiel",
    atelierText: "Vous ne maîtrisez pas encore la machine à coudre ? Nous vous conseillons un atelier en présentiel.",
    atelierBtn: "🧵 Atelier : utilisation de la machine à coudre",
    restart: "Refaire le test",
    errRequired: "Merci de répondre à toutes les questions.",
    errGeneric: "Calcul impossible. Réessayez.",
    loading: "Chargement…", unavailable: "Le test n’est pas disponible pour le moment.",
  },
};

const ACCENT = "var(--thread, #5B16F9)";

export default function LevelTestPopup({
  slug, langue, utm, onClose, onSubscribe,
}: {
  slug: string;
  langue: "ar" | "fr";
  utm?: Record<string, string>;
  onClose: () => void;
  onSubscribe?: () => void;
}) {
  // Textes personnalisables dans l'OS (par-dessus les défauts). Chargés côté
  // client car le popup est un composant partagé (pas de page serveur à lui).
  const [textes, setTextes] = useState<{ fr?: Record<string, string>; ar?: Record<string, string> }>({});
  const t = { ...T[langue], ...(textes?.[langue] ?? {}) };
  const [test, setTest] = useState<PublicTest | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState(0); // index de question, puis « contact »
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ first_name: "", email: "", phone: "" });
  const [accepte, setAccepte] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  // Sur l'écran de résultat : la personne précise si elle veut la formation EN
  // LIGNE (plateforme) ou EN PRÉSENTIEL (Sétif, El Hidhab) — le bouton d'inscription
  // pointe alors vers la landing EXACTE correspondante.
  const [mode, setMode] = useState<null | "online" | "presentiel">(null);
  // « StartTest » ne doit partir qu'UNE fois, au vrai début (1re réponse).
  const started = useRef(false);
  // Événement combiné niveau+format (N1Online, N1Presentiel, …) : une seule fois.
  const comboFired = useRef(false);

  // Le test COMMENCE vraiment quand la personne choisit sa 1re réponse.
  function marquerDebut() {
    if (started.current) return;
    started.current = true;
    pixelCustom("StartTest",
      { content_name: test?.title || slug, content_category: "test_niveau" },
      { name: "start_test", params: { test: slug } });
  }

  // Niveau normalisé N1/N2/N3 à partir du résultat (clé, ou URL de reco
  // /formation/niveau-X). `null` si indéterminé (on retombe sur le libellé).
  function niveauN(r: any): string | null {
    const s = `${r?.recommendation?.course_url ?? ""} ${r?.level_key ?? ""}`;
    const m = s.match(/([1-3])/);
    return m ? `N${m[1]}` : (r?.level_label ?? null);
  }

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

  // Textes personnalisés dans l'OS pour le test (best-effort, n'échoue jamais).
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const r = await fetch(`/api/landing-texts?page=level-test`, { cache: "no-store" });
        if (r.ok && vivant) setTextes(await r.json());
      } catch { /* on garde les textes par défaut */ }
    })();
    return () => { vivant = false; };
  }, []);

  const questions = test?.questions ?? [];
  const total = questions.length;
  // Après les questions du serveur, on insère UNE question locale « mode » (en
  // ligne / présentiel) — affichée comme les autres —, puis l'écran coordonnées.
  const totalQ = total + 1;            // questions serveur + question « mode »
  const surMode = etape === total;     // la question « mode »
  const surContact = etape === totalQ; // l'écran « Recevez votre résultat »
  const cur = (surMode || surContact) ? undefined : questions[etape];
  const pct = Math.round((Math.min(etape, totalQ) / (totalQ + 1)) * 100);
  const peutAvancer = surMode ? mode !== null : (!cur || cur.required === false || answers[cur.key] !== undefined);
  const rtl = langue === "ar";

  function recommencer() {
    setResultat(null); setAnswers({}); setAccepte(false); setMode(null);
    setContact({ first_name: "", email: "", phone: "" }); setEtape(0); setErreur(null);
    comboFired.current = false; // un nouveau passage pourra ré-émettre l'événement combiné.
  }

  // ── Custom Audiences Meta : événement niveau + format ────────────────────
  // Dès que le résultat est là ET que le format a été choisi (question « mode »),
  // on émet UNE seule fois l'événement personnalisé N{1,2,3}{Online|Presentiel}.
  // Il reflète le VRAI choix de la personne (niveau obtenu + format sélectionné)
  // et ne part JAMAIS sur une simple visite : `resultat` n'existe qu'après un test
  // réellement terminé. N'AJOUTE RIEN aux événements existants (StartTest, etc.).
  useEffect(() => {
    if (!resultat || !mode || comboFired.current) return;
    const niveau = niveauN(resultat); // "N1" | "N2" | "N3" | libellé | null
    if (niveau !== "N1" && niveau !== "N2" && niveau !== "N3") return;
    const format = mode === "presentiel" ? "presentiel" : "online";
    const suffixe = format === "presentiel" ? "Presentiel" : "Online";
    const nom =
      resultat?.recommendation?.course_name ??
      resultat?.recommendation?.name ??
      resultat?.level_label ??
      test?.title ??
      niveau;
    comboFired.current = true;
    pixelCustom(`${niveau}${suffixe}`, {
      level: niveau,
      format,
      content_category: "formation",
      content_name: nom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultat, mode]);

  async function envoyer() {
    if (!test) return;
    setErreur(null);
    const manquantes = test.questions.filter((q) => q.required !== false && !answers[q.key]);
    if (manquantes.length || !mode) { setErreur(t.errRequired); return; }
    setEnvoi(true);
    try {
      const email = contact.email.trim();
      const phone = contact.phone.trim();
      const res = await submitLevelTest({
        slug, answers, lang: langue, consent: accepte,
        utm: utm && Object.keys(utm).length ? utm : undefined,
        contact: {
          first_name: contact.first_name.trim() || undefined,
          email: email || undefined,
          phone: phone || undefined,
        },
      });
      if (!res.ok) { setErreur(t.errGeneric); return; }
      setResultat(res.result);
      // Pixel : le test est TERMINÉ et le résultat obtenu → « TestCompleted »
      // (toujours, même anonyme), avec le niveau N1/N2/N3 en paramètre.
      {
        const niveau = niveauN(res.result);
        pixelCustom("TestCompleted", {
          content_name: test.title || t.title,
          content_category: "test_niveau",
          ...(niveau ? { level: niveau } : {}),
          ...(res.result?.level_label ? { level_label: res.result.level_label } : {}),
        }, { name: "test_completed", params: { level: niveau ?? undefined, level_label: res.result?.level_label ?? undefined } });
      }
      // Pixel : un test terminé AVEC des coordonnées est aussi un prospect (Lead).
      if (email || phone) {
        pixelEvent("Lead", {
          content_name: test.title || t.title,
          content_category: "test_niveau",
          ...(res.result?.level_key ? { level: res.result.level_key } : {}),
        }, { name: "generate_lead", params: { method: "test_niveau", level: res.result?.level_key ?? undefined } });
      }
    } catch { setErreur(t.errGeneric); } finally { setEnvoi(false); }
  }

  const skills = Object.entries((resultat?.skills ?? {}) as Record<string, number>);
  const proposeAtelier = answers.machine === "non";
  // URL d'inscription EXACTE selon le mode choisi. On NE réutilise PAS le chemin de
  // la reco serveur (il peut déjà pointer vers un présentiel, ce qui doublait le
  // préfixe « presentiel-presentiel- » et envoyait l'online vers du présentiel).
  // On extrait uniquement le CHIFFRE de niveau (1/2/3) et on reconstruit les deux
  // URL canoniques du site : en ligne = /formation/niveau-N, présentiel =
  // /presentiel/presentiel-niveau-N.
  const recoUrl: string | null = resultat?.recommendation?.course_url || null;
  const chiffreNiveau = (() => {
    const src = `${recoUrl ?? ""} ${resultat?.level_key ?? ""} ${resultat?.level_label ?? ""}`;
    const m = src.match(/([1-3])/);
    return m ? m[1] : null;
  })();
  const onlineUrl = chiffreNiveau ? `/formation/niveau-${chiffreNiveau}` : recoUrl;
  const presentielUrl = chiffreNiveau ? `/presentiel/presentiel-niveau-${chiffreNiveau}` : "/presentiel";
  const cibleUrl = mode === "presentiel" ? presentielUrl : mode === "online" ? onlineUrl : null;

  return (
    <div className="pl-modal" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pl-modal-box" dir={rtl ? "rtl" : "ltr"}>
        <div className="pl-modal-tete">
          <h2 className="pl-h2" style={{ margin: 0 }}>{test?.title || t.title}</h2>
          <button type="button" className="pl-modal-x" onClick={onClose} aria-label={t.close}>✕</button>
        </div>

        {erreur === "unavailable" ? (
          <p className="pl-lede" style={{ margin: 0 }}>{t.unavailable}</p>
        ) : !test ? (
          <p className="pl-lede" style={{ margin: 0 }}>{t.loading}</p>
        ) : resultat ? (
          /* ------------------------------------------------------ Résultat --- */
          <div style={{ textAlign: "center" }}>
            <div aria-hidden="true" style={{
              width: 56, height: 56, borderRadius: 999, margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ACCENT, color: "#fff", fontSize: 26,
            }}>🎉</div>
            <p style={{ textTransform: "uppercase", letterSpacing: rtl ? "normal" : ".05em", fontSize: 13, fontWeight: 700, opacity: 0.7, margin: 0 }}>
              {t.resultTitle}
            </p>
            <h1 className="pl-titre pl-titre-dark" style={{ fontSize: "1.8rem", marginTop: 4 }}>
              {resultat.level_label ?? "—"}
            </h1>
            {resultat.explanation ? (
              <p className="pl-lede" style={{ maxWidth: 420, margin: "10px auto 0" }}>{resultat.explanation}</p>
            ) : null}

            {skills.length ? (
              <div style={{ margin: "24px 0", textAlign: rtl ? "right" : "left" }}>
                {skills.map(([nom, pctSkill]) => (
                  <div key={nom} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                      <span style={{ textTransform: "capitalize" }}>{nom}</span><span>{pctSkill} %</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(0,0,0,.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pctSkill}%`, background: ACCENT }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Le lien d'inscription EXACT, selon le mode choisi pendant le test. */}
            {cibleUrl ? (
              <a className="pl-cta" href={cibleUrl}
                style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
                {mode === "presentiel" ? t.discoverPresentiel : t.discoverOnline}
              </a>
            ) : (
              <button type="button" className="pl-cta" style={{ marginTop: 16 }}
                onClick={() => { onClose(); onSubscribe?.(); }}>
                {mode === "presentiel" ? t.discoverPresentiel : t.discoverOnline}
              </button>
            )}

            {proposeAtelier ? (
              <div style={{ marginTop: 20 }}>
                <p style={{ margin: "0 0 10px", fontWeight: 600 }}>{t.atelierText}</p>
                <a href={ATELIER_MACHINE} style={{
                  display: "inline-block", textDecoration: "none", padding: "14px 28px",
                  borderRadius: 999, fontWeight: 700, color: "#fff", background: "#128a4c",
                }}>{t.atelierBtn}</a>
              </div>
            ) : null}

            <div>
              <button type="button" onClick={recommencer} style={{
                background: "none", border: "none", color: "inherit", opacity: 0.6,
                font: "inherit", cursor: "pointer", marginTop: 18, fontWeight: 600,
              }}>{t.restart}</button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------ Questions puis contact --- */
          <div>
            {test.subtitle ? <p className="pl-lede" style={{ margin: "0 0 8px" }}>{test.subtitle}</p> : null}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.6, margin: "12px 0 6px" }}>
              <span>{pct}%</span>
              <span>{surContact ? t.almost : t.question(etape + 1, totalQ)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(0,0,0,.08)", overflow: "hidden", marginBottom: 22 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: ACCENT, transition: "width .35s" }} />
            </div>

            {surContact ? (
              <div>
                <h3 className="pl-h2" style={{ fontSize: "1.15rem" }}>{t.contactTitle}</h3>
                <p className="pl-lede" style={{ margin: "0 0 12px" }}>{t.contactText}</p>
                <div className="pl-fields">
                  <label className="pl-field pl-field-full">
                    <input value={contact.first_name} placeholder={t.phName} autoComplete="given-name"
                      onChange={(e) => setContact((c) => ({ ...c, first_name: e.target.value }))} />
                  </label>
                  <label className="pl-field">
                    <input type="email" value={contact.email} placeholder={t.phEmail} autoComplete="email"
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
                  </label>
                  <label className="pl-field">
                    <input type="tel" value={contact.phone} placeholder={t.phPhone} autoComplete="tel"
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
                  </label>
                </div>
                <label className="pl-consent">
                  <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                  <span>{test.consent_text || t.consent}</span>
                </label>
                {erreur && erreur !== "unavailable" ? <div className="pl-erreur">{erreur}</div> : null}
                <button type="button" className="pl-cta" disabled={envoi} onClick={envoyer}>
                  {envoi ? t.submitting : t.submit}
                </button>
                <p className="pl-note">{t.privacy}</p>
                <button type="button" onClick={() => setEtape((e) => Math.max(0, e - 1))} style={{
                  background: "none", border: "none", color: "inherit", opacity: 0.7,
                  font: "inherit", cursor: "pointer", fontWeight: 600, marginTop: 6,
                }}>{t.prev}</button>
              </div>
            ) : cur ? (
              <div>
                <h3 className="pl-h2" style={{ fontSize: "1.2rem", marginTop: 0 }}>{cur.q}</h3>
                {cur.description ? <p className="pl-slots-hint">{cur.description}</p> : null}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {cur.options.map((o) => {
                    const on = String(answers[cur.key]) === String(o.value);
                    return (
                      <button type="button" key={String(o.value)} aria-pressed={on}
                        onClick={() => { marquerDebut(); setAnswers((a) => ({ ...a, [cur.key]: String(o.value) })); }}
                        style={{
                          textAlign: rtl ? "right" : "left", padding: "14px 16px", borderRadius: 16,
                          cursor: "pointer", border: `2px solid ${on ? "var(--thread, #5B16F9)" : "rgba(0,0,0,.12)"}`,
                          background: on ? "rgba(0,0,0,.03)" : "transparent",
                          color: "inherit", font: "inherit", fontWeight: on ? 700 : 500,
                        }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
                  <button type="button" onClick={() => setEtape((e) => Math.max(0, e - 1))} disabled={etape === 0}
                    style={{
                      background: "none", border: "none", color: "inherit", font: "inherit",
                      opacity: etape === 0 ? 0.3 : 0.7, cursor: "pointer", fontWeight: 600,
                    }}>
                    {t.prev}
                  </button>
                  <button type="button" className="pl-cta" disabled={!peutAvancer}
                    style={{ width: "auto", margin: 0, padding: "12px 28px" }}
                    onClick={() => setEtape((e) => e + 1)}>
                    {etape < totalQ - 1 ? t.next : t.cont}
                  </button>
                </div>
              </div>
            ) : surMode ? (
              /* Question « mode » — affichée EXACTEMENT comme les autres (briques). */
              <div>
                <h3 className="pl-h2" style={{ fontSize: "1.2rem", marginTop: 0 }}>{t.modeTitle}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {([["online", t.modeOnline, t.modeOnlineSub], ["presentiel", t.modePresentiel, t.modePresentielSub]] as const).map(([val, label, sub]) => {
                    const on = mode === val;
                    return (
                      <button type="button" key={val} aria-pressed={on}
                        onClick={() => { marquerDebut(); setMode(val); }}
                        style={{
                          textAlign: rtl ? "right" : "left", padding: "14px 16px", borderRadius: 16,
                          cursor: "pointer", border: `2px solid ${on ? "var(--thread, #5B16F9)" : "rgba(0,0,0,.12)"}`,
                          background: on ? "rgba(0,0,0,.03)" : "transparent",
                          color: "inherit", font: "inherit", fontWeight: on ? 700 : 500,
                          display: "flex", flexDirection: "column", gap: 3,
                        }}>
                        <span>{label}</span>
                        <small style={{ opacity: 0.7, fontWeight: 500 }}>{sub}</small>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
                  <button type="button" onClick={() => setEtape((e) => Math.max(0, e - 1))}
                    style={{
                      background: "none", border: "none", color: "inherit", font: "inherit",
                      opacity: 0.7, cursor: "pointer", fontWeight: 600,
                    }}>
                    {t.prev}
                  </button>
                  <button type="button" className="pl-cta" disabled={!peutAvancer}
                    style={{ width: "auto", margin: 0, padding: "12px 28px" }}
                    onClick={() => setEtape((e) => e + 1)}>
                    {t.cont}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
