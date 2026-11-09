import { unstable_noStore as noStore } from "next/cache";
import { resumeNiveaux } from "@/lib/niveaux-ar";
import { NiveauxStyles } from "./styles";
import { BoutonTest } from "./boutons";

// Page GLOBALE en arabe (09/11) : les 3 niveaux comme un chemin (1 → 2 → 3),
// chacun avec pour qui, ce qu'on sait faire à la fin, prix en ligne / présentiel.
export const dynamic = "force-dynamic";

const RANG_AR = ["", "الأول", "الثاني", "الثالث"];

export default async function Page() {
  noStore();
  const niveaux = await resumeNiveaux();
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
          <a className="nv-lien-doux" href="/patrons-arazzo">🧵 الباترونات</a>
        </div>
        <div className="nv-metre" aria-hidden="true" />

        <header className="nv-hero">
          <span className="nv-pastille">🪡 مدرسة الخياطة والباترون</span>
          <h1>تعلّمي الخياطة <em>خطوة بخطوة</em></h1>
          <p>3 مستويات، من الصفر حتى فساتين السهرة. عن بُعد من الدار، أو حضوريًا في سطيف والعلمة.</p>
        </header>

        <section className="nv-sec" aria-label="المستويات">
          <div className="nv-chemin">
            <div className="nv-fil" aria-hidden="true" />
            {niveaux.map((n) => (
              <a key={n.meta.slug} href={`/niveaux/${n.meta.slug}`} className="nv-niv">
                <span className="nv-rang" style={{ background: n.meta.couleur }}>
                  {n.meta.rang}
                  <small>{n.meta.icone} {n.meta.pour.split("—")[0].trim()}</small>
                </span>
                <span className="nv-carte nv-couture" style={{ display: "block" }}>
                  <span className="nv-pour" style={{ color: n.meta.couleur }}>المستوى {RANG_AR[n.meta.rang]} · {n.meta.pour}</span>
                  <h3>{n.titre}</h3>
                  <span className="nv-puces">
                    {n.meta.resultats.map((r) => <span key={r} className="nv-puce">{r}</span>)}
                  </span>
                  <span className="nv-prix-ligne">
                    {n.prixEnLigne ? <span>💻 عن بُعد: <b>{n.prixEnLigne}</b></span> : null}
                    {n.prixPresentiel ? <span>🏫 حضوري: من <b>{n.prixPresentiel}</b> للشهر</span> : null}
                  </span>
                  {n.villes.length ? <span className="nv-prix-ligne">📍 {n.villes.join(" · ")}</span> : null}
                  <span className="nv-fleche">اكتشفي المستوى ←</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="nv-sec">
          <div className="nv-note">
            <h4>🤔 ما عرفتيش من وين تبداي؟</h4>
            إذا ما خيّطتيش قبل، ابداي من <b>المستوى الأول</b>. إذا عندكِ شوية معرفة، ديري اختبار المستوى وراح نقولولكِ وين تبداي.
          </div>
          <div style={{ marginTop: 12 }}><BoutonTest /></div>
        </section>

        <p className="nv-pied">Arazzo · مدرسة الخياطة · سطيف · العلمة</p>
      </div>
    </main>
  );
}
