import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { niveauAr, NIVEAUX_AR } from "@/lib/niveaux-ar";
import { NiveauxStyles } from "../styles";
import { BoutonTest } from "../boutons";
import Choix from "./choix";

// Landing ARABE d'UN niveau — v2 (09/11) « photos d'abord » (modèle Domestika / Skillshare) :
// 1. grande photo (couverture du cours) + titre + 3 chiffres + bouton ; 2. les visuels du cours (galerie du LMS) à faire glisser ;
// 3. le programme en une ligne d'étapes (détail replié) ; 4. 3 cartes-photos : en ligne / Sétif / El Eulma
// → les groupes (jour, méthode, horaire, prix, places) ; 5. barre collante prix + bouton.
// L'inscription reste celle des landings existantes (même formulaire, même CRM), ouverte en arabe.
export const dynamic = "force-dynamic";

const RANG_AR = ["", "الأول", "الثاني", "الثالث"];

export default async function Page({ params }: { params: { niveau: string } }) {
  noStore();
  const { niveau } = await params;
  const n = await niveauAr(niveau);
  if (!n) notFound();
  const suivant = NIVEAUX_AR.find((x) => x.rang === n.meta.rang + 1);
  const prixPresentiel = n.centres.map((c) => c.prixMoisMin).find(Boolean);

  return (
    <main className="nv">
      <NiveauxStyles />

      {/* 1. La photo, le titre, 3 chiffres, un bouton */}
      <header className="nv-heros">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {n.image ? <img className="fond" src={n.image} alt="" /> : null}
        <div className="nv-barre">
          <a className="nv-logo" href="/niveaux">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arazzo-icon.png" alt="Arazzo" />
            <span>أرازو</span>
          </a>
          <a className="nv-retour" href="/niveaux">كل المستويات</a>
        </div>
        <div className="nv-in">
          <span className="nv-etiquette">{n.meta.icone} المستوى {RANG_AR[n.meta.rang]} · {n.meta.court}</span>
          <h1>{n.titre}</h1>
          <p>{n.meta.promesse}</p>
          <div className="nv-chiffres">
            <div><b>{n.lecons}</b><small>درس</small></div>
            {n.heures ? <div><b>{n.heures}</b><small>ساعة فيديو</small></div> : null}
            <div><b>{n.chapitres.length}</b><small>محاور</small></div>
          </div>
          <a className="nv-btn" href="#choisir">✋ نسجّل</a>
        </div>
      </header>

      <div className="nv-in">
        {/* 2. Les visuels du cours (galerie du LMS) */}
        {n.galerie.length ? <section className="nv-sec">
          <h2>✂️ واش راح تتعلمي</h2>
          <div className="nv-glisse">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {n.galerie.map((src, i) => <img key={src} src={src} alt={`${n.titre} ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} />)}
          </div>
          <p className="nv-mini">← اسحبي</p>
        </section> : null}

        {/* 3. Le programme en une ligne */}
        {n.chapitres.length ? (
          <section className="nv-sec">
            <h2>📋 البرنامج</h2>
            <div className="nv-etapes">
              {n.chapitres.map((c, i) => <span key={i} className="nv-etape"><i>{i + 1}</i>{c.titre.split(/[(:،,]/)[0].trim()}</span>)}
            </div>
            <details className="nv-plus">
              <summary>＋ كل الدروس ({n.lecons})</summary>
              {n.chapitres.map((c, i) => (
                <div key={i}><b>{i + 1}. {c.titre}</b><ol>{c.lecons.map((l, k) => <li key={k}>{l}</li>)}</ol></div>
              ))}
            </details>
          </section>
        ) : null}

        {/* 4. Comment étudier */}
        <section className="nv-sec" id="choisir">
          <h2>🧭 اختاري طريقتكِ</h2>
          <Choix n={n} />
        </section>

        <section className="nv-sec" style={{ display: "grid", gap: 10 }}>
          <BoutonTest texte="🤔 ما عرفتيش مستواكِ؟ اختبار مجاني" classe="nv-btn nv-btn-blanc" />
          {suivant ? <a className="nv-btn nv-btn-blanc" href={`/niveaux/${suivant.slug}`}>{suivant.icone} المستوى {RANG_AR[suivant.rang]} ←</a> : null}
        </section>
        <p className="nv-pied">Arazzo · سطيف · العلمة</p>
      </div>

      {/* 5. Toujours sous le pouce */}
      <div className="nv-collant">
        <div className="nv-in">
          <span className="nv-collant-prix">
            {n.prixEnLigne ? <>💻 {n.prixEnLigne}</> : null}
            {prixPresentiel ? <small>🏫 {prixPresentiel} / شهر</small> : null}
          </span>
          <a className="nv-btn" href="#choisir">✋ نسجّل</a>
        </div>
      </div>
    </main>
  );
}
