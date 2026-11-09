/**
 * Style des landings arabes /niveaux — « l'atelier » : papier crème, encre violette,
 * coutures en pointillés (le fil), ruban mètre en orange. Mobile d'abord, gros boutons.
 */
const CSS = `
.nv {
  --papier: #FBF6EE; --carte: #FFFFFF; --encre: #23164F; --doux: #6B6390; --trait: #E7DFF7;
  --violet: #5B16F9; --orange: #FE7223; --vert: #128a4c; --rouge: #D7263D;
  min-height: 100vh; background: var(--papier); color: var(--encre);
  font-family: var(--nv-f-texte), "Segoe UI", Tahoma, sans-serif; font-size: 17px; line-height: 1.75;
  background-image: radial-gradient(circle at 1px 1px, rgba(91,22,249,.07) 1px, transparent 0);
  background-size: 22px 22px; padding-bottom: 120px;
}
.nv * { box-sizing: border-box; }
.nv a { color: inherit; }
.nv h1, .nv h2, .nv h3, .nv .nv-titre { font-family: var(--nv-f-titre), var(--nv-f-texte), sans-serif; line-height: 1.6; margin: 0; }
.nv-in { max-width: 760px; margin: 0 auto; padding: 0 16px; }

/* Barre du haut */
.nv-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; }
.nv-marque { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 700; }
.nv-marque img { width: 36px; height: 36px; border-radius: 10px; }
.nv-lien-doux { font-size: .9rem; color: var(--doux); text-decoration: none; border-bottom: 1.5px dashed currentColor; }

/* Ruban mètre */
.nv-metre { height: 14px; border-radius: 3px; margin: 6px 0 0;
  background: repeating-linear-gradient(90deg, #23164F 0 2px, transparent 2px 10px) bottom/100% 6px no-repeat, var(--orange); opacity: .95; }

/* Héros */
.nv-hero { padding: 18px 0 8px; }
.nv-pastille { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 2px dashed var(--violet);
  color: var(--violet); border-radius: 999px; padding: 4px 14px; font-weight: 700; font-size: .92rem; }
.nv-hero h1 { font-size: clamp(2rem, 8vw, 3.1rem); margin: 14px 0 8px; }
.nv-hero h1 em { font-style: normal; color: var(--orange); }
.nv-hero p { color: var(--doux); margin: 0 0 6px; font-size: 1.05rem; }
.nv-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
.nv-badge { background: #fff; border: 1.5px solid var(--trait); border-radius: 12px; padding: 6px 12px; font-weight: 700; font-size: .95rem; }
.nv-img-hero { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: 22px; border: 3px solid #fff;
  box-shadow: 0 18px 40px -18px rgba(35,22,79,.45); margin-top: 16px; display: block; }

/* Sections */
.nv-sec { margin: 34px 0 0; }
.nv-sec > h2 { font-size: 1.55rem; display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.nv-sec > .nv-sous { color: var(--doux); margin: 0 0 14px; }
.nv-carte { background: var(--carte); border-radius: 20px; padding: 18px; border: 1.5px solid var(--trait);
  box-shadow: 0 10px 28px -20px rgba(35,22,79,.35); position: relative; }
.nv-couture { outline: 2px dashed rgba(91,22,249,.28); outline-offset: -9px; }

/* Cartes niveaux (hub) */
.nv-chemin { display: grid; gap: 18px; position: relative; }
.nv-niv { display: grid; grid-template-columns: 74px 1fr; gap: 14px; text-decoration: none; align-items: start;
  transition: transform .18s ease, box-shadow .18s ease; }
.nv-niv:hover { transform: translateY(-3px); box-shadow: 0 18px 34px -20px rgba(35,22,79,.5); }
.nv-rang { width: 74px; height: 74px; border-radius: 20px; display: grid; place-items: center; color: #fff;
  font-family: var(--nv-f-titre), sans-serif; font-size: 2.2rem; font-weight: 700; position: relative; }
.nv-rang small { position: absolute; bottom: -10px; background: #fff; color: var(--encre); font-size: .7rem; padding: 0 8px;
  border-radius: 999px; border: 1.5px solid var(--trait); white-space: nowrap; font-family: var(--nv-f-texte); }
.nv-niv h3 { font-size: 1.25rem; }
.nv-niv .nv-pour { font-weight: 700; font-size: .95rem; }
.nv-puces { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 10px; }
.nv-puce { background: #F3EEFF; color: var(--violet); border-radius: 999px; padding: 2px 10px; font-size: .85rem; font-weight: 700; }
.nv-prix-ligne { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: .95rem; color: var(--doux); }
.nv-prix-ligne b { color: var(--encre); }
.nv-fleche { display: inline-flex; margin-top: 10px; font-weight: 700; color: var(--orange); }
.nv-fil { position: absolute; inset-inline-start: 36px; top: 74px; bottom: 74px; border-inline-start: 3px dashed rgba(91,22,249,.3); z-index: 0; }
.nv-chemin > * { position: relative; z-index: 1; }

/* Boutons */
.nv-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 0; cursor: pointer;
  background: var(--orange); color: #fff !important; font: 700 1.12rem/1.2 var(--nv-f-texte), sans-serif; padding: 16px 18px;
  border-radius: 16px; text-decoration: none; box-shadow: 0 10px 0 -4px #c4520f; transition: transform .12s ease; }
.nv-btn:active { transform: translateY(3px); box-shadow: 0 5px 0 -3px #c4520f; }
.nv-btn-2 { background: #fff; color: var(--violet) !important; border: 2px solid var(--violet); box-shadow: none; }
.nv-btn-vert { background: var(--vert); box-shadow: 0 10px 0 -4px #0b5e33; }

/* Programme */
.nv-mois { font-family: var(--nv-f-titre), sans-serif; color: var(--violet); font-size: 1.05rem; margin: 18px 0 8px;
  display: flex; align-items: center; gap: 10px; }
.nv-mois::after { content: ""; flex: 1; border-top: 2px dashed rgba(91,22,249,.3); }
.nv-axe { background: #fff; border: 1.5px solid var(--trait); border-radius: 16px; margin-bottom: 10px; overflow: hidden; }
.nv-axe summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 40px 1fr auto; gap: 10px;
  align-items: center; padding: 12px 14px; font-weight: 700; }
.nv-axe summary::-webkit-details-marker { display: none; }
.nv-num { width: 40px; height: 40px; border-radius: 12px; background: #F3EEFF; color: var(--violet); display: grid; place-items: center;
  font-family: var(--nv-f-titre), sans-serif; font-size: 1.1rem; }
.nv-axe[open] .nv-num { background: var(--violet); color: #fff; }
.nv-compte { font-size: .8rem; color: var(--doux); font-weight: 500; white-space: nowrap; }
.nv-axe ol { margin: 0; padding: 0 56px 14px 18px; color: var(--doux); font-size: .95rem; }
.nv-axe li { padding: 3px 0; border-bottom: 1px dotted var(--trait); }

/* Galerie */
.nv-galerie { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 4px 2px 10px; }
.nv-galerie img { flex: 0 0 62%; max-width: 260px; aspect-ratio: 4/5; object-fit: cover; border-radius: 16px; scroll-snap-align: start;
  border: 3px solid #fff; box-shadow: 0 8px 20px -14px rgba(35,22,79,.6); }

/* Choix de la manière */
.nv-onglets { display: grid; grid-template-columns: repeat(var(--n, 3), 1fr); gap: 8px; background: #fff; padding: 6px;
  border-radius: 18px; border: 1.5px solid var(--trait); position: sticky; top: 8px; z-index: 5; }
.nv-onglet { border: 0; background: transparent; border-radius: 13px; padding: 10px 4px; cursor: pointer; font: 700 .98rem/1.3 var(--nv-f-texte), sans-serif;
  color: var(--doux); display: grid; gap: 2px; justify-items: center; }
.nv-onglet span { font-size: 1.35rem; }
.nv-onglet[aria-pressed="true"] { background: var(--encre); color: #fff; }
.nv-panneau { margin-top: 14px; display: grid; gap: 12px; animation: nv-entre .25s ease; }
@keyframes nv-entre { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.nv-gros-prix { font-family: var(--nv-f-titre), sans-serif; font-size: 2.1rem; color: var(--encre); }
.nv-gros-prix small { font-size: .95rem; color: var(--doux); font-family: var(--nv-f-texte); }
.nv-liste { list-style: none; margin: 10px 0; padding: 0; display: grid; gap: 6px; }
.nv-liste li { display: flex; gap: 8px; align-items: baseline; }

/* Groupe */
.nv-groupe { display: grid; gap: 10px; }
.nv-groupe-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.nv-jour { font-family: var(--nv-f-titre), sans-serif; font-size: 1.4rem; }
.nv-methode { border-radius: 999px; padding: 3px 12px; font-weight: 700; font-size: .9rem; }
.nv-methode[data-m="rapide"] { background: #FFF0E6; color: #B4470A; }
.nv-methode[data-m="longue"] { background: #E8F6EE; color: var(--vert); }
.nv-infos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.nv-info { background: var(--papier); border-radius: 12px; padding: 8px 10px; }
.nv-info small { display: block; color: var(--doux); font-size: .78rem; }
.nv-info b { font-size: 1.02rem; }
.nv-places { display: grid; gap: 6px; }
.nv-places-barre { display: grid; grid-template-columns: repeat(var(--t), 1fr); gap: 3px; }
.nv-places-barre i { height: 10px; border-radius: 3px; background: #E9E4F5; }
.nv-places-barre i.p { background: var(--rouge); }
.nv-places-txt { font-weight: 700; font-size: .95rem; }
.nv-places-txt[data-peu="1"] { color: var(--rouge); }

.nv-note { background: #FFF7EC; border: 1.5px dashed #F2B27A; border-radius: 14px; padding: 12px 14px; font-size: .95rem; }
.nv-note h4 { margin: 0 0 6px; font-family: var(--nv-f-titre), sans-serif; }

/* FAQ */
.nv-faq details { background: #fff; border: 1.5px solid var(--trait); border-radius: 14px; margin-bottom: 8px; padding: 0 14px; }
.nv-faq summary { cursor: pointer; padding: 12px 0; font-weight: 700; list-style: none; }
.nv-faq summary::before { content: "＋"; color: var(--orange); margin-inline-end: 8px; }
.nv-faq details[open] summary::before { content: "－"; }
.nv-faq p { margin: 0 0 12px; color: var(--doux); }

/* Barre collante du bas */
.nv-collant { position: fixed; inset-inline: 0; bottom: 0; z-index: 40; padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: rgba(251,246,238,.92); backdrop-filter: blur(8px); border-top: 1.5px solid var(--trait); }
.nv-collant .nv-in { display: flex; gap: 10px; align-items: center; padding: 0; }
.nv-collant .nv-btn { padding: 13px 16px; }
.nv-collant-prix { white-space: nowrap; font-weight: 700; font-size: .95rem; line-height: 1.3; }
.nv-collant-prix small { display: block; color: var(--doux); font-weight: 500; font-size: .78rem; }

.nv-pied { text-align: center; color: var(--doux); font-size: .9rem; margin: 40px 0 0; }

@media (min-width: 640px) {
  .nv-galerie img { flex-basis: 32%; }
  .nv-infos { grid-template-columns: repeat(4, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .nv * { animation: none !important; transition: none !important; } }
`;

export function NiveauxStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
