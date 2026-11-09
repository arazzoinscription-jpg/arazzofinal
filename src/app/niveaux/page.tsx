import { unstable_noStore as noStore } from "next/cache";
import { resumeNiveaux } from "@/lib/niveaux-ar";
import { NiveauxStyles } from "./styles";
import { BoutonTest } from "./boutons";

// Page GLOBALE en arabe — v2 (09/11) : 3 grandes cartes-photos, 3 mots chacune.
export const dynamic = "force-dynamic";

const RANG_AR = ["", "الأول", "الثاني", "الثالث"];

export default async function Page() {
  noStore();
  const niveaux = await resumeNiveaux();
  return (
    <main className="nv">
      <NiveauxStyles />
      <div className="nv-in" style={{ paddingTop: 16 }}>
        <a className="nv-logo" href="/niveaux" style={{ color: "var(--encre)", textShadow: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arazzo-icon.png" alt="Arazzo" />
          <span>أرازو للخياطة</span>
        </a>
        <h1 style={{ fontSize: "clamp(2rem, 8vw, 3rem)", margin: "18px 0 4px" }}>
          تعلّمي الخياطة <span style={{ color: "var(--orange)" }}>خطوة بخطوة</span>
        </h1>
        <p style={{ margin: "0 0 18px", color: "var(--doux)" }}>💻 عن بُعد · 🏫 سطيف · 🏫 العلمة</p>

        <div className="nv-niveaux">
          {niveaux.map((n) => (
            <a key={n.meta.slug} href={`/niveaux/${n.meta.slug}`} className="nv-niveau">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {n.image ? <img src={n.image} alt={n.titre} /> : null}
              <span className="rang" style={{ background: n.meta.couleur }}>{n.meta.rang}</span>
              <div>
                <span style={{ fontWeight: 700, opacity: .9 }}>{n.meta.icone} المستوى {RANG_AR[n.meta.rang]} · {n.meta.court}</span>
                <h3>{n.titre}</h3>
                <span className="ligne">
                  <span>{n.prixEnLigne ? <>💻 <b>{n.prixEnLigne}</b></> : null}{n.prixPresentiel ? <> · 🏫 <b>{n.prixPresentiel}</b>/شهر</> : null}</span>
                  <span className="go">شوفي ←</span>
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="nv-sec" style={{ display: "grid", gap: 8 }}>
          <BoutonTest texte="🤔 ما عرفتيش مستواكِ؟ اختبار مجاني" classe="nv-btn nv-btn-blanc" />
        </div>
        <p className="nv-pied">Arazzo · سطيف · العلمة</p>
      </div>
    </main>
  );
}
