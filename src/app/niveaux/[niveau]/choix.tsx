"use client";

import { useState } from "react";
import type { CentreAr, GroupeAr, NiveauAr } from "@/lib/niveaux-ar";
import { LienInscription } from "../boutons";

// v2 (09/11) : 3 cartes-photos (en ligne / Sétif / El Eulma), puis le détail en icônes et les groupes
// en cartes compactes. Très peu de mots.
const METHODE = { rapide: "⚡ مسرّعة", longue: "🌿 مدة طويلة" } as const;

function Places({ restantes, total }: { restantes: number | null; total: number | null }) {
  if (total == null || restantes == null) return null;
  const t = Math.min(total, 20);
  const prises = Math.max(0, Math.min(t, total - restantes));
  return (
    <>
      <div className="nv-places-barre" style={{ ["--t" as string]: t }} aria-hidden="true">
        {Array.from({ length: t }, (_, i) => <i key={i} className={i < prises ? "p" : ""} />)}
      </div>
      <span className="nv-places-txt">{restantes <= 0 ? "🔴 مكتمل" : `🔥 بقات ${restantes} بلايص`}</span>
    </>
  );
}

function Groupe({ g }: { g: GroupeAr }) {
  return (
    <div className="nv-groupe">
      <div className="nv-groupe-l1">
        <span className="nv-jour">{g.jour ?? "فوج جديد"}{g.periode ? ` ${g.periode}` : ""}</span>
        {g.methode ? <span className="nv-methode" data-m={g.methode}>{METHODE[g.methode]}</span> : null}
      </div>
      <div className="nv-faits">
        {g.horaire ? <span>🕗 {g.horaire}</span> : null}
        {g.seance ? <span>⏱️ {g.seance}</span> : null}
        {g.duree ? <span>📅 {g.duree}</span> : null}
        {g.prixMois ? <span>💰 {g.prixMois}/شهر</span> : null}
      </div>
      <Places restantes={g.restantes} total={g.total} />
    </div>
  );
}

function Centre({ c }: { c: CentreAr }) {
  return (
    <div className="nv-detail">
      <div className="nv-icones">
        <div><span>👩‍🏫</span>مع الأستاذة</div>
        <div><span>👭</span>فوج صغير</div>
        <div><span>📍</span>{c.carte ? <a href={c.carte} target="_blank" rel="noreferrer">{c.ville}</a> : c.ville}</div>
      </div>
      {c.groupes.length ? c.groupes.map((g) => <Groupe key={g.id} g={g} />) : (
        <p className="nv-mini">ما كاش فوج مفتوح — سجّلي ونتصلو بيكِ.</p>
      )}
      {c.dossier.length ? (
        <details className="nv-plus"><summary>📂 ملف التسجيل</summary>
          <ol>{c.dossier.map((d) => <li key={d}>{d}</li>)}</ol>
        </details>
      ) : null}
      <LienInscription href={`/presentiel/${c.slug}#pl-form`} cle="arazzo_presentiel_langue" className="nv-btn nv-btn-vert">
        ✋ نحجز بلاصتي
      </LienInscription>
    </div>
  );
}

export default function Choix({ n }: { n: NiveauAr }) {
  const voies = [
    { id: "ligne", nom: "عن بُعد", icone: "💻", fond: "linear-gradient(135deg,#5B16F9,#9B6BFF)", prix: n.prixEnLigne },
    ...n.centres.map((c, i) => ({ id: c.slug, nom: c.ville, icone: "🏫", fond: i ? "linear-gradient(135deg,#FE7223,#FFB27A)" : "linear-gradient(135deg,#128a4c,#4CC38A)", prix: c.prixMoisMin ? `${c.prixMoisMin}/شهر` : null })),
  ];
  const [actif, setActif] = useState<string | null>(null);
  const centre = n.centres.find((c) => c.slug === actif);
  return (
    <div>
      <div className="nv-voies" style={{ ["--n" as string]: voies.length }}>
        {voies.map((v) => (
          <button key={v.id} type="button" className="nv-voie" aria-pressed={actif === v.id} style={{ background: v.fond }}
            onClick={() => { setActif(v.id); setTimeout(() => document.getElementById("detail-voie")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }}>
            <span className="nv-voie-ico" aria-hidden="true">{v.icone}</span>
            <div><h3>{v.nom}</h3>{v.prix ? <span className="prix">{v.prix}</span> : null}</div>
          </button>
        ))}
      </div>

      <div id="detail-voie" style={{ scrollMarginTop: 12 }}>
        {actif === null ? <p className="nv-mini" style={{ marginTop: 10 }}>👆 اضغطي على وحدة</p> : centre ? <Centre key={centre.slug} c={centre} /> : (
          <div className="nv-detail" key="ligne">
            <div className="nv-icones">
              <div><span>📱</span>من التليفون</div>
              <div><span>⏰</span>وقت ما تحبي</div>
              <div><span>♾️</span>مدى الحياة</div>
            </div>
            {n.enLigne?.total != null && n.enLigne.restantes != null ? (
              <div className="nv-groupe">
                <div className="nv-groupe-l1"><span className="nv-jour">👭 الفوج المفتوح</span></div>
                <Places restantes={n.enLigne.restantes} total={n.enLigne.total} />
              </div>
            ) : null}
            <LienInscription href={`/formation/${n.meta.slug}#pl-form`} cle="arazzo_formation_langue" className="nv-btn">
              ✋ نسجّل عن بُعد
            </LienInscription>
            <p className="nv-mini">💳 CCP / BaridiMob · ولا الدفع عند الاستلام</p>
          </div>
        )}
      </div>
    </div>
  );
}
