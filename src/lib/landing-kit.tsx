"use client";

/**
 * Kit de landing partagé — PORT FIDÈLE d'Arazzo OS (`apps/web/app/landing-kit.js`).
 *
 * Le design des landings publiques (présentiel, et plus tard en ligne) vit ici,
 * pour que le LMS (formation-arazzo.store) soit RIGOUREUSEMENT identique à l'OS :
 * même bandeau, même carte, même CTA orange, même jauge de places, bilingue
 * FR/AR + RTL, mode sombre gratuit.
 *
 * Différence avec l'OS : là-bas les tokens de marque (`--brass`, `--violet-deep`,
 * `--thread`…) viennent d'un `globals.css` maison. Le LMS est en Tailwind et n'a
 * pas ces variables, alors on les INJECTE ici, dans le scope `.pl`, avec les
 * mêmes valeurs que l'OS (clair + sombre). La page est ainsi auto-suffisante.
 *
 * Espace de noms « pl- ». Rien ici ne connaît le métier : ni CRM, ni Supabase.
 */

export type Seats = {
  total?: number;
  taken?: number;
  left?: number;
  interested?: number;
  group_open?: boolean;
  group?: {
    name?: string | null;
    day?: string | null;
    period?: string | null;
    slot?: string | null;
    session_label?: string | null;
    duration_label?: string | null;
    status?: string | null;
  } | null;
};

/** Les libellés bilingues dont la jauge a besoin. */
export type SeatsLabels = {
  seatsTitle: string;
  placesLeft: (n: number) => string;
  interestedCount: (n: number) => string;
  takeSeat: string;
  seatsFull: string;
  sentBadge: string;
};

/** Les paramètres UTM du lien : on les transmet, jamais on ne les invente. */
export function utmDeLURL(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = p.get(k);
    if (v) out[k] = v;
  }
  return out;
}

/**
 * La jauge de places : une grille de pastilles (prises / libres), le nombre de
 * places restantes, un signal d'« intéressées », et un bouton d'action. « Prise »
 * vient de l'OS (personnes confirmées / inscriptions validées) ; le bouton passe
 * au VERT quand CE visiteur a déjà envoyé sa demande.
 */
export function SeatsBanner({
  seats,
  t,
  sent,
  onTake,
  groupInfo,
}: {
  seats: Seats;
  t: SeatsLabels;
  sent?: boolean;
  onTake?: () => void;
  groupInfo?: string | null;
}) {
  const total = Math.max(1, Number(seats.total) || 12);
  const taken = Math.min(Math.max(0, Number(seats.taken) || 0), total);
  const left = Math.max(0, total - taken);
  const urgent = left > 0 && left <= 4;
  return (
    <div
      className={`pl-seats${urgent ? " urgent" : ""}${left <= 0 ? " complet" : ""}`}
      style={{ ["--d" as string]: ".02s" }}
    >
      <div className="pl-seats-tete">
        <span className="pl-seats-titre">🎟️ {t.seatsTitle}</span>
        <span className="pl-seats-reste">{t.placesLeft(left)}</span>
      </div>
      {groupInfo ? <div className="pl-seats-groupe">📅 {groupInfo}</div> : null}
      <div className="pl-seats-grid" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className={`pl-seat${i < taken ? " pris" : ""}`} />
        ))}
      </div>
      <div className="pl-seats-bas">
        {Number(seats.interested) > 0 ? (
          <span className="pl-seats-int">🔥 {t.interestedCount(Number(seats.interested))}</span>
        ) : (
          <span />
        )}
        {sent ? (
          <span className="pl-seats-sent">{t.sentBadge}</span>
        ) : left <= 0 ? (
          <button type="button" className="pl-seats-btn complet" disabled>
            {t.seatsFull}
          </button>
        ) : (
          <button type="button" className="pl-seats-btn" onClick={onTake}>
            {t.takeSeat}
          </button>
        )}
      </div>
    </div>
  );
}

/** Les styles « pl- » partagés + les tokens de marque (identiques à l'OS). */
export function LandingStyles() {
  return (
    <style>{`
/* ── Tokens de marque (valeurs identiques à l'OS globals.css), injectés dans le
      scope de la landing pour la rendre auto-suffisante côté LMS. ── */
.pl {
  --bg: #F5F0EB;
  --panel: #FFFFFF;
  --panel-2: #F0EAE0;
  --line: #E6DECF;
  --ink: #1A1A2E;
  --ink-2: #4A4468;
  --ink-3: #8B85A0;
  --thread: #5B16F9;
  --violet-deep: #2A0880;
  --violet-soft: #F1ECFE;
  --brass: #FE7223;
  --ok: #1F7A55;
  --warn: #B45A09;
  --bad: #B3261E;
  --radius: 12px;
  --radius-sm: 9px;
  --radius-xl: 24px;
  --mono: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
  --serif: "Playfair Display", Georgia, serif;
  --sans: "DM Sans", system-ui, -apple-system, sans-serif;
  --police-arabe: "IBM Plex Sans Arabic", "Segoe UI", "Noto Naskh Arabic", sans-serif;
}
@media (prefers-color-scheme: dark) {
  .pl {
    --bg: #141020;
    --panel: #1C1730;
    --panel-2: #241E38;
    --line: #322A4C;
    --ink: #F4F0FA;
    --ink-2: #C4BAD9;
    --ink-3: #8B82A3;
    --thread: #9A6CFF;
    --violet-deep: #C4A9FF;
    --violet-soft: #271E42;
    --brass: #FF9048;
    --ok: #4FBF8B;
    --warn: #E0A050;
    --bad: #F07A72;
  }
}

.pl {
  position: fixed; inset: 0; z-index: 200; overflow-y: auto;
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--brass) 8%, transparent), transparent 60%),
    radial-gradient(120% 90% at 0% 20%, var(--violet-soft), transparent 55%),
    var(--bg);
  color: var(--ink); font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
.pl[dir="rtl"] { font-family: var(--police-arabe, "IBM Plex Sans Arabic", var(--sans)); }
.pl[dir="rtl"] .pl-titre,
.pl[dir="rtl"] .pl-h2,
.pl[dir="rtl"] .pl-marque,
.pl[dir="rtl"] .pl-slots-box legend { font-family: var(--police-arabe, "IBM Plex Sans Arabic", var(--serif)); }
.pl-empty { text-align: center; color: var(--ink-3); padding: 20vh 24px; font-size: 1.05rem; }

.pl-langue {
  position: fixed; top: 14px; inset-inline-end: 16px; z-index: 210; cursor: pointer;
  font-family: var(--sans); font-size: .84rem; font-weight: 700; color: #fff;
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28);
  padding: 8px 14px; border-radius: 999px; backdrop-filter: blur(6px);
  transition: background .2s ease, transform .15s ease;
}
.pl-langue:hover { background: rgba(255,255,255,.24); transform: translateY(-1px); }

/* --- Bandeau ------------------------------------------------------------ */
.pl-hero {
  position: relative; color: #fff; overflow: hidden;
  background:
    radial-gradient(140% 120% at 12% -10%, #4a17c9 0%, #2A0880 52%, #22076b 100%);
  padding: clamp(28px, 6vw, 64px) 24px clamp(64px, 9vw, 104px);
  border-bottom: 3px solid var(--brass);
}
.pl-hero::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 22px; height: 0;
  border-top: 2px dashed color-mix(in srgb, var(--brass) 75%, transparent);
  opacity: .5;
}
.pl-hero::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .06;
  background-image: radial-gradient(#fff 1px, transparent 1.4px);
  background-size: 22px 22px;
}
.pl-hero-in { max-width: 680px; margin: 0 auto; position: relative; z-index: 1; }
.pl-marque {
  display: inline-flex; align-items: center; gap: 11px;
  font-family: var(--serif); font-weight: 700; font-size: 1.15rem;
  letter-spacing: .01em; margin-bottom: clamp(16px, 4vw, 32px); color: #fff;
}
.pl-marque-nom em { color: var(--brass); font-style: italic; }
.pl-logo {
  width: 40px; height: 40px; border-radius: 11px; flex: none; object-fit: cover;
  background: #fff; padding: 3px; box-shadow: 0 6px 16px -6px rgba(0,0,0,.4);
}
.pl-eyebrow {
  display: inline-block; font-size: .74rem; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: color-mix(in srgb, #fff 82%, var(--brass));
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16);
  padding: 6px 12px; border-radius: 999px;
}
.pl[dir="rtl"] .pl-eyebrow { letter-spacing: normal; }
.pl-titre {
  font-family: var(--serif); font-weight: 600; line-height: 1.05;
  font-size: clamp(2.1rem, 1.2rem + 4.4vw, 3.5rem);
  margin: 16px 0 0; letter-spacing: -.01em;
}
.pl[dir="rtl"] .pl-titre { line-height: 1.2; letter-spacing: normal; font-weight: 700; }
.pl-titre em { font-style: italic; color: var(--brass); }
.pl[dir="rtl"] .pl-titre em { font-style: normal; }
.pl-tagline {
  color: rgba(255,255,255,.86); font-size: clamp(1rem, .95rem + .4vw, 1.2rem);
  margin: 14px 0 0; max-width: 52ch; line-height: 1.6;
}
.pl-specs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.pl-spec {
  font-size: .82rem; font-weight: 600; color: #fff;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18);
  padding: 7px 13px; border-radius: 999px; backdrop-filter: blur(4px);
}
.pl-spec-prix { background: var(--brass); border-color: var(--brass); color: #fff; }

.pl-tarif {
  border: 1.5px solid color-mix(in srgb, var(--brass) 30%, var(--line));
  background: color-mix(in srgb, var(--brass) 6%, var(--panel));
  border-radius: var(--radius); padding: 16px 18px;
}
.pl-tarif-prix { font-family: var(--serif); font-weight: 700; font-size: 1.6rem; color: var(--brass); line-height: 1.1; }
.pl-tarif-prix span { font-family: var(--sans); font-size: .9rem; font-weight: 600; color: var(--ink-2); }

/* --- Contenu ----------------------------------------------------------- */
.pl-wrap { max-width: 680px; margin: 0 auto; padding: 0 24px clamp(48px, 8vw, 96px); }
.pl-card {
  position: relative; margin-top: clamp(-48px, -6vw, -40px);
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--radius-xl, 24px);
  box-shadow: 0 24px 60px -28px color-mix(in srgb, var(--violet-deep) 45%, transparent);
  padding: clamp(24px, 5vw, 44px);
}
.pl-lede { color: var(--ink-2); font-size: 1.06rem; line-height: 1.6; margin: 0 0 22px; }

.pl-h2 {
  font-family: var(--serif); font-weight: 600; font-size: 1.4rem;
  color: var(--violet-deep); margin: 0 0 14px; line-height: 1.2;
  display: flex; align-items: center; gap: 10px;
}
.pl-h2::before {
  content: ""; width: 10px; height: 10px; border-radius: 2px;
  background: var(--brass); transform: rotate(45deg); flex: none;
}
.pl-section { margin-top: 30px; }
.pl-programme-img {
  display: block; width: 100%; height: auto; border-radius: var(--radius);
  border: 1px solid var(--line); box-shadow: 0 10px 30px -18px color-mix(in srgb, var(--violet-deep) 50%, transparent);
  transition: transform .15s ease, box-shadow .2s ease; cursor: zoom-in;
}
.pl-programme-img:hover { transform: translateY(-2px); box-shadow: 0 16px 36px -18px color-mix(in srgb, var(--violet-deep) 60%, transparent); }

.pl-actions { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-bottom: 8px; }
@media (max-width: 520px) { .pl-actions { grid-template-columns: 1fr; } }
.pl-ghost {
  display: flex; align-items: center; gap: 12px; text-decoration: none;
  padding: 14px 16px; border-radius: var(--radius);
  border: 1.5px solid color-mix(in srgb, var(--thread) 30%, var(--line));
  background: color-mix(in srgb, var(--thread) 5%, var(--panel));
  color: var(--ink); transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease;
}
.pl-ghost:hover { transform: translateY(-2px); border-color: var(--thread);
  box-shadow: 0 12px 24px -16px color-mix(in srgb, var(--thread) 60%, transparent); }
.pl-ghost-alt { border-color: color-mix(in srgb, var(--brass) 40%, var(--line));
  background: color-mix(in srgb, var(--brass) 7%, var(--panel)); }
.pl-ghost-alt:hover { border-color: var(--brass);
  box-shadow: 0 12px 24px -16px color-mix(in srgb, var(--brass) 55%, transparent); }
.pl-ghost-ico { font-size: 1.5rem; line-height: 1; flex: none; }
.pl-ghost strong { display: block; font-size: .96rem; }
.pl-ghost small { display: block; color: var(--ink-3); font-size: .8rem; margin-top: 2px; }

.pl-acc {
  margin-top: 14px; border-radius: var(--radius);
  border: 1.5px solid color-mix(in srgb, var(--thread) 25%, var(--line));
  background: color-mix(in srgb, var(--thread) 4%, var(--panel)); overflow: hidden;
}
.pl-acc + .pl-acc { margin-top: 10px; }
.pl-acc > summary {
  cursor: pointer; list-style: none; padding: 14px 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  color: var(--ink); font-size: .98rem;
}
.pl-acc > summary::-webkit-details-marker { display: none; }
.pl-acc > summary::after { content: "▾"; color: var(--ink-3); transition: transform .2s ease; }
.pl-acc[open] > summary::after { transform: rotate(180deg); }
.pl-acc-body { padding: 0 16px 16px; color: var(--ink-2); line-height: 1.6; font-size: .92rem; }
.pl-acc-body p { margin: 6px 0; }
.pl-acc-alert { border-color: #e0453a; background: color-mix(in srgb, #e0453a 6%, var(--panel)); }
.pl-acc-alert > summary { color: #c23b30; }
.pl-line { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; border-top: 1px dashed var(--line); }
.pl-line:first-child { border-top: 0; }
.pl-line b { color: var(--brass); white-space: nowrap; font-family: var(--mono, ui-monospace, monospace); }
.pl-acc-note { margin-top: 10px; font-size: .86rem; color: var(--ink-3); }
.pl-rtl-block { text-align: start; }

.pl-testbox {
  margin-top: 16px; padding: 16px 18px; border-radius: var(--radius);
  border: 1.5px dashed color-mix(in srgb, var(--thread) 45%, var(--line));
  background: color-mix(in srgb, var(--violet-soft) 40%, var(--panel));
}
.pl-testbox p { margin: 0 0 10px; color: var(--ink); line-height: 1.6; }
.pl-testbtn {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none;
  font-family: inherit; font-weight: 700; font-size: .96rem; color: #fff;
  background: var(--thread); padding: 12px 20px; border-radius: 999px;
}
.pl-testbtn:hover { filter: brightness(1.05); }

.pl-atelier-phrase {
  margin: 14px 0 8px !important; color: var(--ink); line-height: 1.6; font-weight: 600;
}
.pl-atelier-btn {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
  font-family: inherit; font-weight: 700; font-size: .96rem; color: #fff;
  background: #128a4c; padding: 12px 20px; border-radius: 999px;
}
.pl-atelier-btn:hover { filter: brightness(1.08); }

.pl-groupes-duo { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 18px; }
@media (max-width: 480px) { .pl-groupes-duo { grid-template-columns: 1fr; } }

.pl-fiche {
  padding: 16px 18px; border-radius: var(--radius);
  border: 1.5px solid color-mix(in srgb, var(--thread) 30%, var(--line));
  background: color-mix(in srgb, var(--violet-soft) 30%, var(--panel));
}
.pl-fiche-steps { margin: 0; padding-inline-start: 20px; line-height: 1.7; color: var(--ink); }
.pl-fiche-steps li { margin: 2px 0; }
.pl-fiche-img {
  display: block; width: 100%; max-width: 420px; border-radius: 12px;
  border: 1px solid var(--line); box-shadow: 0 8px 22px -14px rgba(0,0,0,.3);
}

.pl-platform-link {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 14px;
  text-decoration: none; font-weight: 700; font-size: .95rem; color: #fff;
  background: #128a4c; padding: 10px 18px; border-radius: 999px;
}
.pl-platform-link:hover { filter: brightness(1.08); }

.pl-modal {
  position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center;
  background: rgba(20,8,60,.55); backdrop-filter: blur(3px); padding: 16px;
}
.pl-modal-box {
  width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto;
  background: var(--panel); border-radius: var(--radius-xl, 24px); border: 1px solid var(--line);
  box-shadow: 0 30px 80px -30px rgba(0,0,0,.6); padding: 22px;
}
.pl-modal-tete { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.pl-modal-x {
  border: none; background: var(--panel-2, #f0ecfb); color: var(--ink); cursor: pointer;
  width: 34px; height: 34px; border-radius: 999px; font-size: 1.1rem; flex: none;
}
.pl-modal-frame { width: 100%; height: 62vh; border: 1px solid var(--line); border-radius: var(--radius); }

.pl-dossier {
  margin-top: 22px; padding: 16px 18px; border-radius: var(--radius);
  background: color-mix(in srgb, var(--brass) 9%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brass) 32%, transparent);
  border-left: 4px solid var(--brass);
}
.pl[dir="rtl"] .pl-dossier { border-left: 1px solid color-mix(in srgb, var(--brass) 32%, transparent); border-right: 4px solid var(--brass); }
.pl-dossier-tete { font-weight: 700; color: var(--warn); margin-bottom: 4px; }
.pl-dossier p { color: var(--ink-2); margin: 4px 0 0; line-height: 1.5; }
.pl-check-list { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 6px; }
.pl-check-list li { position: relative; padding-left: 24px; line-height: 1.4; color: var(--ink); }
.pl[dir="rtl"] .pl-check-list li { padding-left: 0; padding-right: 24px; }
.pl-check-list li::before {
  content: "✓"; position: absolute; left: 0; top: 0; font-weight: 800;
  color: var(--brass);
}
.pl[dir="rtl"] .pl-check-list li::before { left: auto; right: 0; }

.pl-adresse { color: var(--ink-2); margin: 0 0 12px; line-height: 1.5; }
.pl-map-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.pl-map-btn {
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
  padding: 11px 16px; border-radius: 999px; font-weight: 600; font-size: .9rem;
  background: var(--violet-soft); color: var(--violet-deep);
  border: 1px solid color-mix(in srgb, var(--thread) 25%, transparent);
  transition: transform .15s ease, background .2s ease;
}
.pl-map-btn:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--thread) 14%, var(--panel)); }
.pl-map-btn-video { background: color-mix(in srgb, var(--brass) 14%, var(--panel)); color: var(--warn);
  border-color: color-mix(in srgb, var(--brass) 35%, transparent); }

.pl-kv { display: flex; justify-content: space-between; gap: 14px; padding: 7px 0; border-top: 1px solid var(--line); }
.pl-kv:first-child { border-top: 0; }
.pl-kv strong { font-family: var(--mono, ui-monospace, monospace); color: var(--violet-deep); }

/* --- Formulaire -------------------------------------------------------- */
.pl-form { margin-top: 34px; padding-top: 28px; border-top: 1px dashed var(--line); }
.pl-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 520px) { .pl-fields { grid-template-columns: 1fr; } }
.pl-field { display: flex; flex-direction: column; gap: 6px; }
.pl-field.pl-field-full { grid-column: 1 / -1; }
.pl-field > span { font-weight: 600; font-size: .84rem; color: var(--ink-2); }
.pl-field > span em { font-style: normal; color: var(--ink-3); font-weight: 500; }
.pl-field input, .pl-field select {
  width: 100%; padding: 12px 14px; font-size: 1rem; color: var(--ink); font-family: inherit;
  background: color-mix(in srgb, var(--violet-soft) 55%, var(--panel));
  border: 1.5px solid var(--line); border-radius: var(--radius-sm);
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.pl[dir="rtl"] .pl-field input { text-align: right; }
.pl-field input:focus, .pl-field select:focus {
  outline: none; border-color: var(--thread); background: var(--panel);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--thread) 18%, transparent);
}
.pl-slots-box { border: 0; padding: 0; margin: 22px 0 0; }
.pl-slots-box legend { font-family: var(--serif); font-weight: 600; font-size: 1.15rem; color: var(--violet-deep); padding: 0; }
.pl-slots-hint { color: var(--ink-3); font-size: .86rem; margin: 4px 0 12px; }
.pl-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
.pl-slot {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 12px 14px; font-size: .92rem; font-weight: 600; text-align: left;
  color: var(--ink); background: var(--panel); font-family: inherit;
  border: 1.5px solid var(--line); border-radius: var(--radius);
  transition: all .15s ease;
}
.pl[dir="rtl"] .pl-slot { text-align: right; }
.pl-slot:hover { border-color: color-mix(in srgb, var(--thread) 45%, var(--line)); transform: translateY(-1px); }
.pl-slot[data-on="true"] {
  background: var(--thread); color: #fff; border-color: var(--thread);
  box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--thread) 70%, transparent);
}
.pl-slot-tick {
  width: 20px; height: 20px; flex: none; border-radius: 6px;
  display: grid; place-items: center; font-size: .8rem; font-weight: 800;
  border: 1.5px solid color-mix(in srgb, var(--thread) 40%, var(--line));
  color: #fff; background: transparent;
}
.pl-slot[data-on="true"] .pl-slot-tick { background: var(--brass); border-color: var(--brass); }

.pl-formules { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pl-formule {
  position: relative; display: block; text-align: start; cursor: pointer; font: inherit;
  padding: 12px 12px; border: 1.5px solid var(--line); border-radius: var(--radius);
  background: var(--panel); color: var(--ink); transition: all .15s ease;
}
.pl-formule:hover { border-color: color-mix(in srgb, var(--thread) 45%, var(--line)); transform: translateY(-1px); }
.pl-formule[data-on="true"] {
  border-color: var(--thread); background: color-mix(in srgb, var(--thread) 6%, var(--panel));
  box-shadow: 0 8px 20px -12px color-mix(in srgb, var(--thread) 55%, transparent);
}
.pl-formule-tick {
  position: absolute; inset-block-start: 8px; inset-inline-end: 8px;
  width: 18px; height: 18px; border-radius: 999px;
  display: grid; place-items: center; font-size: .68rem; font-weight: 800; color: #fff;
  border: 1.5px solid color-mix(in srgb, var(--thread) 40%, var(--line)); background: transparent;
}
.pl-formule[data-on="true"] .pl-formule-tick { background: var(--brass); border-color: var(--brass); }
.pl-formule-corps { display: flex; flex-direction: column; gap: 3px; }
.pl-formule-corps strong { font-size: .9rem; line-height: 1.2; color: var(--violet-deep); padding-inline-end: 20px; }
.pl-formule-meta { font-size: .76rem; color: var(--ink-2); line-height: 1.35; }
.pl-formule-prix {
  margin-top: 4px; align-self: flex-start; font-weight: 700; font-size: .84rem;
  color: var(--brass); background: color-mix(in srgb, var(--brass) 12%, transparent);
  padding: 2px 8px; border-radius: 999px;
}
@media (max-width: 340px) { .pl-formules { grid-template-columns: 1fr; } }

.pl-erreur {
  margin-top: 14px; padding: 12px 14px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bad) 12%, var(--panel));
  color: var(--bad); border: 1px solid color-mix(in srgb, var(--bad) 35%, transparent);
  font-weight: 600; font-size: .9rem;
}
.pl-cta {
  width: 100%; margin-top: 22px; padding: 16px 20px; cursor: pointer;
  font-family: var(--sans); font-size: 1.08rem; font-weight: 700; color: #fff;
  border: none; border-radius: var(--radius);
  background: linear-gradient(135deg, #FE7223, #f2520a);
  box-shadow: 0 16px 30px -14px color-mix(in srgb, var(--brass) 75%, transparent);
  transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
}
.pl[dir="rtl"] .pl-cta { font-family: var(--police-arabe, "IBM Plex Sans Arabic", var(--sans)); }
.pl-cta:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.04);
  box-shadow: 0 22px 40px -16px color-mix(in srgb, var(--brass) 80%, transparent); }
.pl-cta:disabled { opacity: .6; cursor: default; }
.pl-note { text-align: center; color: var(--ink-3); font-size: .82rem; line-height: 1.5; margin-top: 14px; }
.pl-fileinput { width: 100%; }
.pl-consent { display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; font-size: .9rem; line-height: 1.5; color: var(--ink-2); cursor: pointer; }
.pl-consent input { margin-top: 3px; flex: none; width: 18px; height: 18px; accent-color: var(--thread); }

/* --- Merci ------------------------------------------------------------- */
.pl-merci { text-align: center; padding: 12px 0 8px; }
.pl-check {
  width: 76px; height: 76px; border-radius: 999px; margin: 0 auto 20px;
  display: grid; place-items: center; font-size: 2rem; color: #fff;
  background: linear-gradient(135deg, var(--ok), color-mix(in srgb, var(--ok) 70%, #000));
  box-shadow: 0 16px 30px -14px color-mix(in srgb, var(--ok) 70%, transparent);
}
.pl-titre-dark { color: var(--violet-deep); font-size: clamp(1.7rem, 1.2rem + 2vw, 2.3rem); font-family: var(--serif); }
.pl-titre-dark em { color: var(--brass); font-style: italic; }
.pl-merci p { color: var(--ink-2); line-height: 1.6; max-width: 44ch; margin: 8px auto 0; }

.pl-pied { text-align: center; color: var(--ink-3); font-size: .8rem; margin-top: 24px; letter-spacing: .04em; }

/* --- Jauge de places -------------------------------------------------- */
.pl-seats {
  border: 1.5px solid color-mix(in srgb, var(--brass, #FE7223) 30%, var(--line, #e7e1f7));
  background: color-mix(in srgb, var(--brass, #FE7223) 6%, var(--panel, #fff));
  border-radius: 16px; padding: 14px 16px; margin-bottom: 18px;
}
.pl-seats.urgent { border-color: #e0453a; background: color-mix(in srgb, #e0453a 8%, var(--panel, #fff)); }
.pl-seats.complet { border-color: var(--line, #ccc); background: color-mix(in srgb, var(--ink, #333) 5%, var(--panel, #fff)); }
.pl-seats-tete { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.pl-seats-titre { font-weight: 700; font-size: .95rem; }
.pl-seats-reste { font-weight: 800; color: #e0453a; font-size: .95rem; }
.pl-seats.complet .pl-seats-reste { color: var(--ink-3, #888); }
.pl-seats-groupe {
  margin-top: 8px; font-size: .9rem; font-weight: 700; line-height: 1.4;
  color: var(--violet-deep, #2A0880);
  background: color-mix(in srgb, var(--thread, #5B16F9) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--thread, #5B16F9) 22%, transparent);
  padding: 8px 12px; border-radius: 10px;
}
.pl-seats-grid { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0; }
.pl-seat {
  width: 22px; height: 22px; border-radius: 7px; flex: 0 0 auto;
  background: color-mix(in srgb, var(--brass, #FE7223) 16%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--brass, #FE7223) 40%, transparent);
}
.pl-seat.pris {
  background: #e0453a; border-color: #e0453a;
  box-shadow: inset 0 0 0 3px color-mix(in srgb, #fff 55%, transparent);
}
.pl-seats-bas { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.pl-seats-int { font-size: .82rem; color: var(--ink-2, #6b6480); font-weight: 600; }
.pl-seats-btn {
  border: none; cursor: pointer; font-family: inherit; font-weight: 800; font-size: .95rem;
  color: #fff; background: #e0453a; padding: 11px 20px; border-radius: 12px;
  box-shadow: 0 4px 14px color-mix(in srgb, #e0453a 40%, transparent);
  animation: plPulse 1.8s ease-in-out infinite;
}
.pl-seats-btn.complet { background: var(--ink-3, #999); cursor: default; box-shadow: none; animation: none; }
.pl-seats-sent {
  font-weight: 700; font-size: .9rem; color: #128a4c;
  background: color-mix(in srgb, #128a4c 12%, transparent);
  padding: 9px 14px; border-radius: 10px;
}
@keyframes plPulse { 0%,100% { transform: none; } 50% { transform: scale(1.04); } }
@media (prefers-reduced-motion: reduce) { .pl-seats-btn { animation: none; } }

/* --- Entrée chorégraphiée --------------------------------------------- */
@keyframes plUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.pl-card > * { animation: plUp .5s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, 0s); }
.pl-hero-in > * { animation: plUp .55s cubic-bezier(.2,.7,.2,1) both; }
.pl-eyebrow { animation-delay: .04s; }
.pl-titre { animation-delay: .1s; }
.pl-tagline { animation-delay: .16s; }
.pl-specs { animation-delay: .22s; }
/* --- Mobile ------------------------------------------------------------ */
@media (max-width: 560px) {
  .pl-langue { top: 10px; inset-inline-end: 10px; padding: 6px 11px; font-size: .78rem; }
  .pl-hero { padding: 46px 18px 78px; }
  .pl-marque { font-size: 1.05rem; }
  .pl-logo { width: 36px; height: 36px; }
  .pl-wrap { padding: 0 16px 56px; }
  .pl-card { padding: 22px 18px; border-radius: 20px; }
  .pl-slots { grid-template-columns: 1fr 1fr; }
  .pl-map-actions { flex-direction: column; }
  .pl-map-btn { justify-content: center; }
}
@media (max-width: 380px) {
  .pl-slots { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .pl-card > *, .pl-hero-in > * { animation: none; }
}
`}</style>
  );
}
