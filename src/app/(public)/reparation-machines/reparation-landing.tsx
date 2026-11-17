"use client";

import { useRef, useState } from "react";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { NavLanding } from "@/components/landing/nav-landing";
import { submitPresentielLead } from "@/app/actions/presentiel-lead";
import { trackLead } from "@/lib/track-conversion";
import { utmDeLURL } from "@/lib/landing-kit";
import { FAQ, PHOTOS } from "./contenu";

const arabe = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], display: "swap" });

export type CentreOffre = {
  price_total: number | null;
  formulas: { id: string; label?: string; price_label?: string; duration_label?: string }[];
  schedule_label: string | null;
  address: string | null;
  maps_url: string | null;
  seats: { remaining?: number | null } | null;
};

const CENTRES = [
  { id: "setif", nom: "سطيف", slug: "reparation-machines" },
  { id: "eulma", nom: "العلمة", slug: "reparation-machines-eulma" },
] as const;

const JOURS = [
  { id: "samedi", nom: "السبت" },
  { id: "dimanche", nom: "الأحد" },
  { id: "lundi", nom: "الاثنين" },
  { id: "mardi", nom: "الثلاثاء" },
  { id: "mercredi", nom: "الأربعاء" },
  { id: "jeudi", nom: "الخميس" },
];
const MOMENTS = [
  { id: "matin", nom: "الصباح" },
  { id: "apres-midi", nom: "العشية" },
];

const POURQUOI = [
  { ico: "💰", t: "توفّري مصروف الميكانيسيان", d: "أغلب الأعطال بسيطة: إبرة، خيط، ضبط، تزييت. تتعلميها مرة وتصلحيها طول عمرك." },
  { ico: "⏱️", t: "ما تحبسيش الخدمة", d: "كي تطيح الماشينة وسط الكوموند، تعرفي واش بيها وتعاوديها تخدم في دقائق." },
  { ico: "🧵", t: "غرزة نقية وماشينة مضبوطة", d: "خيط يتقطع؟ غرزة تقفز؟ قماش يتجمع؟ نفهمو السبب ونصلحوه من الأصل." },
  { ico: "🏠", t: "لورشتك ولصحاباتك", d: "صيانة ماشينات الورشة، وحتى خدمة زايدة: تصليح ماشينات الخياطات اللي حذاك." },
];

const PROGRAMME = [
  {
    jour: "اليوم 1",
    titre: "الماشينة الدروات (الغرزة المستقيمة)",
    points: ["أسماء القطع ودور كل قطعة", "التنظيف والتزييت الصحيح", "تبديل الإبرة واختيار رقمها حسب القماش", "تعمار الخيط وضبط التونسيون (شدّ الخيط)", "ضبط طول الغرزة وقدم الضغط"],
  },
  {
    jour: "اليوم 2",
    titre: "السرجيتوز (Surjeteuse)",
    points: ["تعمار الخيوط الأربعة بالترتيب", "ضبط الشدّ حسب القماش", "السكاكين: تنظيف، ضبط وتبديل", "الكروشيات (Boucleurs) وكيفاش يخدمو", "الأعطال المعروفة: خيط يتقطع، غرزة تقفز"],
  },
  {
    jour: "اليوم 3",
    titre: "تشخيص الأعطال والصيانة الدورية",
    points: ["كيفاش تعرفي العطب من الصوت والغرزة", "التوقيت (Synchronisation) بين الإبرة والكروشي", "تفكيك وتركيب القطع بلا خوف", "برنامج صيانة أسبوعي وشهري", "تطبيق كامل على ماشينات المركز"],
  },
  {
    jour: "اختياري",
    titre: "الكولوريت (Recouvreuse) — للمهتمّات فقط",
    points: ["تعمار الخيوط والإبر المتعددة", "ضبط الكروشي والشدّ", "الأعطال الخاصة بالكولوريت", "يوم زايد، تختاريه في الاستمارة"],
  },
];

const prix = (n: number) => `${n.toLocaleString("fr-FR").replace(/ /g, " ")} دج`;

export default function ReparationLanding({ setif, eulma }: { setif: CentreOffre | null; eulma: CentreOffre | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [son, setSon] = useState(false);
  const [centre, setCentre] = useState<"setif" | "eulma">("setif");
  const [kolorit, setKolorit] = useState(false);
  const [creneaux, setCreneaux] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [message, setMessage] = useState("");
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | "erreur">("");
  const [erreur, setErreur] = useState("");
  const [photo, setPhoto] = useState<number | null>(null);

  const offre = centre === "setif" ? setif : eulma;
  const formuleBase = offre?.formulas.find((f) => f.id === "base");
  const formuleKolorit = offre?.formulas.find((f) => f.id === "collerette");

  const activerSon = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    void v.play();
    setSon(true);
  };

  const basculer = (id: string) =>
    setCreneaux((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nom.trim().length < 2 || tel.trim().length < 6) {
      setErreur("اكتبي اسمك ورقم الواتساب.");
      return;
    }
    if (!creneaux.length) {
      setErreur("اختاري على الأقل يوم واحد تكوني فيه حرة.");
      return;
    }
    setErreur("");
    setEtat("envoi");
    const c = CENTRES.find((x) => x.id === centre)!;
    const res = await submitPresentielLead({
      slug: c.slug,
      offer: `تصليح ماشينات الخياطة — ${c.nom}`,
      first_name: nom.trim(),
      phone: tel.trim(),
      city: centre === "setif" ? "Sétif" : "El Eulma",
      availabilities: creneaux,
      formula_id: kolorit ? "collerette" : "base",
      message: [kolorit ? "+ الكولوريت (Recouvreuse)" : "", message.trim()].filter(Boolean).join(" — ") || undefined,
      consent: true,
      lang: "ar",
      utm: utmDeLURL(),
    }).catch(() => ({ ok: false as const, error: "" }));
    if (res.ok) {
      setEtat("ok");
      trackLead({ content_name: "reparation-machines", value: offre?.price_total ?? undefined });
    } else {
      setEtat("erreur");
      setErreur("ما وصلش الطلب، عاودي بعد لحظة أو راسلينا في الواتساب.");
    }
  };

  return (
    <div dir="rtl" lang="ar" className={`rm ${arabe.className}`}>
      <NavLanding lang="ar" />
      <style>{CSS}</style>

      {/* 1. ENTRÉE : la vidéo du formateur en haut. */}
      <header className="rm-hero">
        <div className="rm-hero-txt">
          <p className="rm-eyebrow">🛠️ تكوين حضوري مكثّف · المستوى 0</p>
          <h1>
            تصليح ماشينات الخياطة <em>في 3 أيام</em>
          </h1>
          <p className="rm-sous">
            الماشينة الدروات، السرجيتوز، والكولوريت (اختيارية). تعلّمي تصلحي وتضبطي ماشينتك وحدك — في <b>سطيف</b> و<b>العلمة</b>.
          </p>
          <ul className="rm-puces">
            <li>📅 3 أيام</li>
            <li>📍 سطيف · العلمة</li>
            <li>👥 مجموعات صغيرة</li>
            <li>🔧 تطبيق على ماشينات حقيقية</li>
          </ul>
          <a href="#inscription" className="rm-cta">✋ نحجز بلاصتي</a>
        </div>
        <div className="rm-video">
          <video
            ref={videoRef}
            src="/reparation-machines/formateur.mp4"
            poster="/reparation-machines/machine-kolorit.jpg"
            autoPlay
            muted
            loop={!son}
            playsInline
            controls={son}
            preload="metadata"
          />
          {!son && (
            <button type="button" className="rm-son" onClick={activerSon}>
              🔊 اسمعي شرح المكوّن
            </button>
          )}
        </div>
      </header>

      <main className="rm-main">
        {/* 2. À quoi ça sert */}
        <section className="rm-bloc">
          <h2>علاش تكوين تصليح الماشينات؟</h2>
          <div className="rm-grille4">
            {POURQUOI.map((p) => (
              <div key={p.t} className="rm-carte">
                <span className="rm-ico">{p.ico}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Photos réelles */}
        <section className="rm-bloc">
          <h2>من داخل التكوين</h2>
          <p className="rm-intro">صور حقيقية من حصص تصليح الماشينات في مركز Arazzo.</p>
          <div className="rm-galerie">
            {PHOTOS.map((p, i) => (
              <button key={p.src} type="button" className="rm-photo" onClick={() => setPhoto(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} loading="lazy" width={600} height={1067} />
                <span>{p.legende}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 4. Programme */}
        <section className="rm-bloc">
          <h2>البرنامج يوم بيوم</h2>
          <div className="rm-grille4">
            {PROGRAMME.map((j) => (
              <div key={j.titre} className={`rm-carte rm-jour${j.jour === "اختياري" ? " rm-option" : ""}`}>
                <span className="rm-badge">{j.jour}</span>
                <h3>{j.titre}</h3>
                <ul>
                  {j.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Pour qui */}
        <section className="rm-bloc rm-pourqui">
          <h2>لمن هذا التكوين؟</h2>
          <ul>
            <li>الخياطات اللي عندهم ماشينة في الدار وحابين ما يحتاجوش الميكانيسيان في كل عطب.</li>
            <li>مولات الورشات: صيانة ماشينات الورشة وتقليل وقت التوقف.</li>
            <li>اللي حابّة تبدا خدمة زايدة: تصليح وصيانة ماشينات الخياطة.</li>
            <li>طالبات Arazzo في المستوى 1، 2 و3 باش يكمّلو التكوين.</li>
          </ul>
        </section>

        {/* 6. Tarif (seulement si l'offre est ouverte dans l'OS) */}
        {(formuleBase || offre?.price_total) && (
          <section className="rm-bloc rm-tarif">
            <h2>السعر</h2>
            <div className="rm-grille2">
              <div className="rm-carte">
                <h3>الدروات + السرجيتوز · 3 أيام</h3>
                <p className="rm-prix">{formuleBase?.price_label || (offre?.price_total ? prix(offre.price_total) : "")}</p>
              </div>
              {formuleKolorit && (
                <div className="rm-carte rm-option">
                  <h3>+ الكولوريت (Recouvreuse)</h3>
                  <p className="rm-prix">{formuleKolorit.price_label}</p>
                </div>
              )}
            </div>
            {offre?.schedule_label && <p className="rm-intro">🕘 {offre.schedule_label}</p>}
          </section>
        )}

        {/* 7. Inscription */}
        <section className="rm-bloc rm-form" id="inscription">
          <h2>سجّلي في التكوين</h2>
          {etat === "ok" ? (
            <div className="rm-ok">
              ✓ وصلنا طلبك! نختارو الأيام اللي تناسب كل المسجّلات ونعيطولك في الواتساب باش نأكدو.
            </div>
          ) : (
            <form onSubmit={envoyer}>
              <fieldset>
                <legend>📍 المركز</legend>
                <div className="rm-choix">
                  {CENTRES.map((c) => (
                    <label key={c.id} className={centre === c.id ? "on" : ""}>
                      <input type="radio" name="centre" checked={centre === c.id} onChange={() => setCentre(c.id)} />
                      {c.nom}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>🧵 الماشينات</legend>
                <div className="rm-choix">
                  <label className={!kolorit ? "on" : ""}>
                    <input type="radio" name="formule" checked={!kolorit} onChange={() => setKolorit(false)} />
                    الدروات + السرجيتوز (3 أيام)
                  </label>
                  <label className={kolorit ? "on" : ""}>
                    <input type="radio" name="formule" checked={kolorit} onChange={() => setKolorit(true)} />
                    + الكولوريت (يوم زايد)
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>📅 واش من أيام تكوني حرة؟</legend>
                <p className="rm-note">
                  اختاري <b>كل</b> الأيام اللي تكوني فيها حرة. من بعد نختارو الأيام اللي تناسب كل المسجّلات، ونعلموك.
                </p>
                <div className="rm-jours">
                  {JOURS.map((j) => (
                    <div key={j.id} className="rm-jour-l">
                      <span>{j.nom}</span>
                      {MOMENTS.map((m) => {
                        const id = `${j.id}-${m.id}`;
                        return (
                          <button type="button" key={id} className={creneaux.includes(id) ? "on" : ""} onClick={() => basculer(id)} aria-pressed={creneaux.includes(id)}>
                            {m.nom}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </fieldset>

              <div className="rm-champs">
                <label>
                  الاسم
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="اسمك" autoComplete="name" />
                </label>
                <label>
                  رقم واتساب
                  <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="0X XX XX XX XX" inputMode="tel" dir="ltr" autoComplete="tel" />
                </label>
                <label className="rm-large">
                  ملاحظة <small>(اختياري)</small>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="مثلا: عندي ماشينة فيها مشكل في الخيط" />
                </label>
              </div>
              {erreur && <p className="rm-err">{erreur}</p>}
              <button type="submit" className="rm-cta" disabled={etat === "envoi"}>
                {etat === "envoi" ? "…" : "✋ نحجز بلاصتي"}
              </button>
            </form>
          )}
        </section>

        {/* 8. Questions (mots-clés) */}
        <section className="rm-bloc">
          <h2>أسئلة متكرّرة</h2>
          <div className="rm-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="rm-pied">
          Arazzo — تكوين الخياطة والباترون في سطيف والعلمة · تصليح وصيانة ماشينات الخياطة الدروات، السرجيتوز والكولوريت.
        </p>
      </main>

      {photo !== null && (
        <div className="rm-loupe" onClick={() => setPhoto(null)} role="dialog" aria-label={PHOTOS[photo].alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTOS[photo].src} alt={PHOTOS[photo].alt} />
          <p>{PHOTOS[photo].legende}</p>
        </div>
      )}
    </div>
  );
}

const CSS = `
.rm{--v:#2A0880;--v2:#5B16F9;--vs:#F1ECFE;--o:#FE7223;--ink:#1A1A2E;--ink2:#4A4468;--bg:#FBF9FF;--panel:#fff;--line:#E6DFF7;
  background:radial-gradient(120% 60% at 0% 0%,var(--vs),transparent 60%),var(--bg);color:var(--ink);min-height:100vh;padding-bottom:96px}
@media (prefers-color-scheme:dark){.rm{--v:#C4A9FF;--v2:#9A6CFF;--vs:#271E42;--ink:#F4F0FA;--ink2:#C4BAD9;--bg:#141020;--panel:#1C1730;--line:#322A4C;--o:#FF9048}}
.rm-hero{max-width:1100px;margin:0 auto;padding:20px 16px 8px;display:grid;gap:22px;align-items:center}
@media (min-width:860px){.rm-hero{grid-template-columns:1.1fr .9fr;padding-top:36px}}
.rm-eyebrow{display:inline-block;background:var(--vs);color:var(--v);border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-weight:700;font-size:.9rem}
.rm h1{font-size:clamp(1.9rem,1.3rem + 3vw,3rem);line-height:1.2;margin:14px 0 10px;color:var(--v);font-weight:700}
.rm h1 em{font-style:normal;color:var(--o)}
.rm-sous{font-size:1.1rem;line-height:1.8;color:var(--ink2);margin:0 0 14px}
.rm-puces{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0 0 18px}
.rm-puces li{background:var(--panel);border:1.5px solid var(--line);border-radius:10px;padding:6px 10px;font-weight:600;font-size:.95rem}
.rm-cta{display:inline-flex;justify-content:center;align-items:center;gap:8px;background:var(--o);color:#fff;border:none;border-radius:14px;
  padding:14px 26px;font-weight:700;font-size:1.1rem;text-decoration:none;cursor:pointer;box-shadow:0 8px 20px -8px var(--o);font-family:inherit}
.rm-cta:disabled{opacity:.6}
.rm-video{position:relative;border-radius:22px;overflow:hidden;border:3px solid var(--o);background:#000;max-width:420px;width:100%;justify-self:center;aspect-ratio:9/16}
.rm-video video{width:100%;height:100%;object-fit:cover;display:block}
.rm-son{position:absolute;inset:auto 12px 14px 12px;background:rgba(42,8,128,.92);color:#fff;border:2px solid #fff;border-radius:12px;padding:12px;
  font-weight:700;font-size:1.05rem;cursor:pointer;font-family:inherit}
.rm-main{max-width:1100px;margin:0 auto;padding:0 16px}
.rm-bloc{margin-top:40px}
.rm h2{font-size:clamp(1.4rem,1.1rem + 1.4vw,2rem);color:var(--v);margin:0 0 6px;padding-bottom:8px;border-bottom:3px solid var(--o);display:inline-block}
.rm-intro{color:var(--ink2);margin:8px 0 14px}
.rm-grille4{display:grid;gap:14px;margin-top:16px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.rm-grille2{display:grid;gap:14px;margin-top:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.rm-carte{background:var(--panel);border:2px solid var(--line);border-radius:16px;padding:16px;position:relative}
.rm-carte h3{margin:6px 0;font-size:1.12rem;color:var(--ink)}
.rm-carte p,.rm-carte li{color:var(--ink2);line-height:1.75}
.rm-carte ul{margin:6px 0 0;padding-inline-start:18px}
.rm-ico{font-size:1.8rem}
.rm-jour{border-top:5px solid var(--v2)}
.rm-option{border-color:var(--o);border-style:dashed}
.rm-badge{display:inline-block;background:var(--v2);color:#fff;border-radius:8px;padding:3px 10px;font-weight:700;font-size:.85rem}
.rm-option .rm-badge{background:var(--o)}
.rm-galerie{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
@media (min-width:700px){.rm-galerie{grid-template-columns:repeat(4,1fr)}}
.rm-photo{position:relative;padding:0;border:none;border-radius:14px;overflow:hidden;cursor:zoom-in;background:#000;aspect-ratio:9/14}
.rm-photo img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
.rm-photo:hover img{transform:scale(1.04)}
.rm-photo span{position:absolute;inset:auto 0 0 0;padding:26px 8px 8px;background:linear-gradient(transparent,rgba(20,10,50,.88));color:#fff;
  font-size:.86rem;line-height:1.5;text-align:start;font-family:inherit}
.rm-pourqui ul{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:8px}
.rm-pourqui li{background:var(--panel);border-inline-start:5px solid var(--o);border-radius:10px;padding:10px 14px;line-height:1.7}
.rm-prix{font-size:1.6rem;font-weight:700;color:var(--o)!important;margin:4px 0 0}
.rm-form form{background:var(--panel);border:2px solid var(--v2);border-radius:20px;padding:18px;margin-top:16px;display:grid;gap:16px}
.rm-form fieldset{border:none;margin:0;padding:0}
.rm-form legend{font-weight:700;font-size:1.1rem;color:var(--v);margin-bottom:8px}
.rm-choix{display:flex;flex-wrap:wrap;gap:8px}
.rm-choix label{flex:1 1 160px;border:2px solid var(--line);border-radius:12px;padding:12px;font-weight:600;cursor:pointer;display:flex;gap:8px;align-items:center}
.rm-choix label.on{border-color:var(--v2);background:var(--vs)}
.rm-note{background:color-mix(in srgb,var(--o) 12%,transparent);border:1.5px solid var(--o);border-radius:10px;padding:10px 12px;margin:0 0 10px;line-height:1.7}
.rm-jours{display:grid;gap:6px}
.rm-jour-l{display:grid;grid-template-columns:90px 1fr 1fr;gap:6px;align-items:center}
.rm-jour-l span{font-weight:700}
.rm-jour-l button{border:2px solid var(--line);background:transparent;color:var(--ink);border-radius:10px;padding:10px 4px;font-weight:600;cursor:pointer;font-family:inherit;min-height:44px}
.rm-jour-l button.on{border-color:var(--v2);background:var(--v2);color:#fff}
.rm-champs{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.rm-champs label{display:grid;gap:6px;font-weight:600}
.rm-champs .rm-large{grid-column:1/-1}
.rm-champs input,.rm-champs textarea{border:2px solid var(--line);border-radius:10px;padding:12px;font-size:16px;font-family:inherit;background:var(--bg);color:var(--ink)}
.rm-err{color:#B3261E;font-weight:700;margin:0}
.rm-ok{background:color-mix(in srgb,#1F7A55 14%,transparent);border:2px solid #1F7A55;border-radius:14px;padding:16px;font-weight:700;line-height:1.8;margin-top:16px}
.rm-faq{display:grid;gap:8px;margin-top:16px}
.rm-faq details{background:var(--panel);border:2px solid var(--line);border-radius:12px;padding:12px 14px}
.rm-faq summary{font-weight:700;cursor:pointer}
.rm-faq p{color:var(--ink2);line-height:1.8;margin:8px 0 0}
.rm-pied{margin:40px 0 0;color:var(--ink2);font-size:.9rem;text-align:center}
.rm-loupe{position:fixed;inset:0;z-index:300;background:rgba(10,5,25,.92);display:grid;place-items:center;padding:16px;cursor:zoom-out}
.rm-loupe img{max-height:82vh;max-width:100%;border-radius:14px}
.rm-loupe p{color:#fff;font-weight:600;text-align:center;margin:10px 0 0}
`;
