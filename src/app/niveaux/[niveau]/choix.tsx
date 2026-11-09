"use client";

import { useState } from "react";
import type { CentreAr, GroupeAr, NiveauAr } from "@/lib/niveaux-ar";
import { LienInscription } from "../boutons";

const METHODE = { rapide: "⚡ المسرّعة", longue: "🌿 المدة الطويلة" } as const;

function Places({ g }: { g: GroupeAr }) {
  if (g.total == null || g.restantes == null) return null;
  const total = Math.min(g.total, 20);
  const prises = Math.max(0, Math.min(total, g.total - g.restantes));
  const peu = g.restantes <= 3;
  return (
    <div className="nv-places">
      <div className="nv-places-barre" style={{ ["--t" as string]: total }} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <i key={i} className={i < prises ? "p" : ""} />)}
      </div>
      <span className="nv-places-txt" data-peu={peu ? "1" : "0"}>
        {g.restantes <= 0 ? "🔴 الفوج مكتمل — قائمة الانتظار" : `🔥 بقات ${g.restantes} بلايص من ${g.total}`}
      </span>
    </div>
  );
}

function Groupe({ g }: { g: GroupeAr }) {
  const infos = [
    g.horaire && { t: "🕗 الوقت", v: g.horaire },
    g.seance && { t: "⏱️ مدة الحصة", v: g.seance },
    g.duree && { t: "📅 مدة التكوين", v: g.duree },
    g.prixMois && { t: "💰 السعر", v: `${g.prixMois} / الشهر` },
  ].filter(Boolean) as { t: string; v: string }[];
  return (
    <div className="nv-carte nv-groupe">
      <div className="nv-groupe-tete">
        <span className="nv-jour">📆 {g.jour ?? "فوج جديد"}{g.periode ? ` ${g.periode}` : ""}</span>
        {g.methode ? <span className="nv-methode" data-m={g.methode}>{METHODE[g.methode]}</span> : null}
      </div>
      <div className="nv-infos">
        {infos.map((i) => <div key={i.t} className="nv-info"><small>{i.t}</small><b>{i.v}</b></div>)}
      </div>
      <Places g={g} />
    </div>
  );
}

function Centre({ c }: { c: CentreAr }) {
  return (
    <div className="nv-panneau">
      <div className="nv-carte">
        <div className="nv-gros-prix"><small>ابتداءً من </small>{c.prixMoisMin ?? "—"} <small>/ الشهر</small></div>
        <ul className="nv-liste">
          <li>👩‍🏫 أفواج صغيرة، مع الأستاذة وجهًا لوجه</li>
          <li>⚡ <span><b>المسرّعة</b>: حصص أطول، تكملي في وقت أقصر</span></li>
          <li>🌿 <span><b>المدة الطويلة</b>: حصص أقصر، على راحتكِ</span></li>
          <li>📍 المركز في {c.ville}{c.carte ? <> · <a href={c.carte} target="_blank" rel="noreferrer">افتحي الخريطة</a></> : null}</li>
          {c.video ? <li>🎥 <a href={c.video} target="_blank" rel="noreferrer">شوفي كيفاش توصلي للمركز</a></li> : null}
        </ul>
      </div>
      <h3 className="nv-titre" style={{ fontSize: "1.2rem", marginTop: 6 }}>👇 اختاري الفوج اللي يناسبكِ</h3>
      {c.groupes.length ? c.groupes.map((g) => <Groupe key={g.id} g={g} />) : (
        <div className="nv-note">ما كاش فوج مفتوح حاليًا في {c.ville}. سجّلي وراح نتصلوا بيكِ أول ما يتفتح فوج جديد.</div>
      )}
      {c.dossier.length ? (
        <div className="nv-note">
          <h4>📂 ملف التسجيل في المركز</h4>
          <ul className="nv-liste" style={{ margin: 0 }}>{c.dossier.map((d) => <li key={d}>✔️ {d}</li>)}</ul>
        </div>
      ) : null}
      <LienInscription href={`/presentiel/${c.slug}#pl-form`} cle="arazzo_presentiel_langue" className="nv-btn nv-btn-vert">
        ✋ نحجز بلاصتي في {c.ville}
      </LienInscription>
    </div>
  );
}

export default function Choix({ n }: { n: NiveauAr }) {
  const onglets = [
    { id: "ligne", icone: "💻", nom: "عن بُعد" },
    ...n.centres.map((c) => ({ id: c.slug, icone: "🏫", nom: c.ville })),
  ];
  const [actif, setActif] = useState(onglets[0].id);
  const centre = n.centres.find((c) => c.slug === actif);
  return (
    <div>
      <div className="nv-onglets" style={{ ["--n" as string]: onglets.length }} role="group" aria-label="طريقة التكوين">
        {onglets.map((o) => (
          <button key={o.id} type="button" className="nv-onglet" aria-pressed={actif === o.id} onClick={() => setActif(o.id)}>
            <span>{o.icone}</span>{o.nom}
          </button>
        ))}
      </div>

      {centre ? <Centre key={centre.slug} c={centre} /> : (
        <div className="nv-panneau" key="ligne">
          <div className="nv-carte">
            <div className="nv-gros-prix">{n.prixEnLigne ?? "—"} <small>· مرة وحدة</small></div>
            <ul className="nv-liste">
              <li>🎬 {n.lecons} درس بالفيديو{n.heures ? ` (حوالي ${n.heures} ساعة)` : ""}</li>
              <li>⏰ تقراي وقت ما تحبي، من الدار، بالتليفون ولا البي سي</li>
              <li>♾️ الدروس تبقى عندكِ مدى الحياة</li>
              <li>🎓 شهادة في آخر التكوين</li>
              <li>💳 الدفع بـ CCP / BaridiMob، ولا الدفع عند الاستلام</li>
            </ul>
          </div>
          {n.enLigne ? (
            <div className="nv-carte nv-groupe">
              <div className="nv-groupe-tete">
                <span className="nv-jour">👭 الفوج المفتوح</span>
                <span className="nv-methode" data-m="longue">مفتوح للتسجيل</span>
              </div>
              {n.enLigne.debut ? <span>🚀 يبدا يوم {new Date(n.enLigne.debut).toLocaleDateString("ar-DZ", { day: "numeric", month: "long" })}</span> : null}
              {n.enLigne.total != null && n.enLigne.restantes != null ? (
                <Places g={{ id: "l", jour: null, periode: null, methode: null, horaire: null, seance: null, duree: null, prixMois: null,
                  restantes: n.enLigne.restantes, total: n.enLigne.total, prises: null }} />
              ) : null}
            </div>
          ) : null}
          <LienInscription href={`/formation/${n.meta.slug}#pl-form`} cle="arazzo_formation_langue" className="nv-btn">
            ✋ نسجّل عن بُعد
          </LienInscription>
        </div>
      )}
    </div>
  );
}
