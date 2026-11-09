import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { niveauAr, NIVEAUX_AR } from "@/lib/niveaux-ar";
import { NiveauxStyles } from "../styles";
import { BoutonTest } from "../boutons";
import Choix from "./choix";

// Landing ARABE d'UN niveau (09/11) : ce qu'on apprend (axes → leçons, mois par mois),
// les photos, puis « comment étudier » : en ligne / Sétif / El Eulma avec les groupes ouverts
// (jour, méthode, horaire, durée de séance, prix, places). L'inscription reste celle des
// landings existantes (même formulaire, même CRM), ouverte directement en arabe.
export const dynamic = "force-dynamic";

const RANG_AR = ["", "الأول", "الثاني", "الثالث"];
const MOIS_AR = ["", "الشهر الأول", "الشهر الثاني", "الشهر الثالث", "الشهر الرابع", "الشهر الخامس", "الشهر السادس"];

export default async function Page({ params }: { params: { niveau: string } }) {
  noStore();
  const { niveau } = await params;
  const n = await niveauAr(niveau);
  if (!n) notFound();
  const suivant = NIVEAUX_AR.find((x) => x.rang === n.meta.rang + 1);
  const mois = [...new Set(n.chapitres.map((c) => c.mois ?? 0))].sort((a, b) => a - b);
  const prixMin = [n.prixEnLigne, ...n.centres.map((c) => c.prixMoisMin)].filter(Boolean);

  return (
    <main className="nv">
      <NiveauxStyles />
      <div className="nv-in">
        <div className="nv-top">
          <a className="nv-marque" href="/niveaux">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arazzo-icon.png" alt="Arazzo" />
            <span>أرازو للخياطة</span>
          </a>
          <a className="nv-lien-doux" href="/niveaux">→ كل المستويات</a>
        </div>
        <div className="nv-metre" aria-hidden="true" />

        {/* 1. En un coup d'œil */}
        <header className="nv-hero">
          <span className="nv-pastille" style={{ color: n.meta.couleur, borderColor: n.meta.couleur }}>
            {n.meta.icone} المستوى {RANG_AR[n.meta.rang]} · {n.meta.pour}
          </span>
          <h1>{n.titre}</h1>
          <p>{n.meta.promesse}</p>
          <div className="nv-badges">
            <span className="nv-badge">📚 {n.chapitres.length} محاور</span>
            <span className="nv-badge">🎬 {n.lecons} درس</span>
            {n.mois ? <span className="nv-badge">📅 {n.mois === 2 ? "شهرين" : `${n.mois} أشهر`} من البرنامج</span> : null}
            {n.centres.length ? <span className="nv-badge">📍 عن بُعد · {n.centres.map((c) => c.ville).join(" · ")}</span> : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {n.image ? <img className="nv-img-hero" src={n.image} alt={n.titre} /> : null}
        </header>

        {/* 2. Ce qu'elle saura faire */}
        <section className="nv-sec">
          <h2>🎯 في آخر المستوى، تعرفي</h2>
          <div className="nv-puces" style={{ marginTop: 10 }}>
            {n.meta.resultats.map((r) => <span key={r} className="nv-puce" style={{ fontSize: "1rem", padding: "6px 14px" }}>✔️ {r}</span>)}
          </div>
          {n.description ? <p className="nv-sous" style={{ marginTop: 10 }}>{n.description}</p> : null}
        </section>

        {/* 3. Le programme, mois par mois */}
        {n.chapitres.length ? (
          <section className="nv-sec" id="programme">
            <h2>📋 البرنامج</h2>
            <p className="nv-sous">اضغطي على كل محور باش تشوفي الدروس اللي فيه.</p>
            {mois.map((m) => (
              <div key={m}>
                {mois.length > 1 && m ? <div className="nv-mois">{MOIS_AR[m] ?? `الشهر ${m}`}</div> : null}
                {n.chapitres.filter((c) => (c.mois ?? 0) === m).map((c) => {
                  const i = n.chapitres.indexOf(c) + 1;
                  return (
                    <details key={i} className="nv-axe">
                      <summary>
                        <span className="nv-num">{i}</span>
                        <span>{c.titre}</span>
                        <span className="nv-compte">{c.lecons.length} درس</span>
                      </summary>
                      <ol>{c.lecons.map((l, k) => <li key={k}>{l}</li>)}</ol>
                    </details>
                  );
                })}
              </div>
            ))}
          </section>
        ) : null}

        {/* 4. Les photos */}
        {n.galerie.length ? (
          <section className="nv-sec">
            <h2>📸 من خدمة المتربصات</h2>
            <p className="nv-sous">اسحبي باش تشوفي أكثر ←</p>
            <div className="nv-galerie">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {n.galerie.map((src, i) => <img key={src} src={src} alt={`صورة ${i + 1}`} loading="lazy" />)}
            </div>
          </section>
        ) : null}

        {/* 5. Comment étudier */}
        <section className="nv-sec" id="choisir">
          <h2>🧭 كيفاش تحبي تقراي؟</h2>
          <p className="nv-sous">نفس البرنامج — اختاري الطريقة اللي تناسبكِ.</p>
          <Choix n={n} />
        </section>

        {/* 6. Questions */}
        <section className="nv-sec nv-faq">
          <h2>❓ أسئلة كثيرة</h2>
          <details><summary>ما خيّطتش قبل، نقدر نبدا؟</summary>
            <p>{n.meta.rang === 1 ? "إيه! المستوى الأول مصمّم للمبتدئات، نبداو من الأدوات وأخذ المقاسات." : "هذا المستوى يحتاج الأساسيات. إذا ما كنتيش متأكدة، ديري اختبار المستوى."}</p></details>
          <details><summary>واش الفرق بين عن بُعد والحضوري؟</summary>
            <p>نفس البرنامج. عن بُعد تقراي بالفيديو وقت ما تحبي من الدار. الحضوري في المركز مع الأستاذة، في فوج صغير، بأيام وأوقات محددة.</p></details>
          <details><summary>واش الفرق بين المسرّعة والمدة الطويلة؟</summary>
            <p>المسرّعة: حصص أطول وتكملي في وقت أقصر. المدة الطويلة: حصص أقصر وتقراي على راحتكِ، والسعر في الشهر أقل.</p></details>
          <details><summary>كيفاش نخلّص؟</summary>
            <p>عن بُعد: CCP / BaridiMob وترسلي صورة الوصل، ولا الدفع عند الاستلام. الحضوري: تحجزي بلاصتكِ من الصفحة، والتسجيل يتأكّد بعد إيداع الملف في المركز.</p></details>
        </section>

        <section className="nv-sec" style={{ display: "grid", gap: 10 }}>
          <a className="nv-btn" href="#choisir">✋ نختار طريقتي ونسجّل</a>
          <BoutonTest />
          {suivant ? <a className="nv-btn nv-btn-2" href={`/niveaux/${suivant.slug}`}>{suivant.icone} بعد هذا: المستوى {RANG_AR[suivant.rang]} ←</a> : null}
        </section>

        <p className="nv-pied">Arazzo · مدرسة الخياطة · سطيف · العلمة</p>
      </div>

      {/* Barre collante : le prix et le bouton, toujours sous le pouce. */}
      <div className="nv-collant">
        <div className="nv-in">
          {prixMin.length ? (
            <span className="nv-collant-prix">
              {n.prixEnLigne ? <>💻 {n.prixEnLigne}</> : null}
              {n.centres[0]?.prixMoisMin ? <small>🏫 من {n.centres[0].prixMoisMin} / الشهر</small> : null}
            </span>
          ) : null}
          <a className="nv-btn" href="#choisir">✋ نسجّل</a>
        </div>
      </div>
    </main>
  );
}
