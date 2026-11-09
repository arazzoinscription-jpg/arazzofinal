/**
 * Style des landings arabes /niveaux — v2 (09/11) « photos d'abord, très peu de mots »,
 * inspiré des pages de cours Domestika / Skillshare : grande photo en tête, un titre,
 * un prix, un bouton ; puis des cartes-photos de 2 mots. Mobile d'abord.
 */
const CSS = `
.nv {
  --papier: #FBF6EE; --encre: #1E1442; --doux: #6B6390; --trait: #ECE5F8;
  --violet: #5B16F9; --orange: #FE7223; --vert: #128a4c; --rouge: #D7263D;
  min-height: 100vh; background: var(--papier); color: var(--encre);
  font-family: var(--nv-f-texte), "Segoe UI", Tahoma, sans-serif; font-size: 17px; line-height: 1.6; padding-bottom: 110px;
}
.nv * { box-sizing: border-box; }
.nv a { color: inherit; text-decoration: none; }
.nv h1, .nv h2, .nv h3 { font-family: var(--nv-f-titre), var(--nv-f-texte), sans-serif; line-height: 1.5; margin: 0; font-weight: 700; }
.nv-in { max-width: 760px; margin: 0 auto; padding: 0 16px; }

/* Héros photo plein écran */
.nv-heros { position: relative; min-height: 78vh; display: grid; align-items: end; color: #fff; overflow: hidden; }
.nv-heros img.fond { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.nv-heros::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,20,66,.2) 0%, rgba(30,20,66,0) 22%, rgba(30,20,66,.78) 48%, rgba(30,20,66,.96) 100%); }
.nv-heros .nv-in { position: relative; z-index: 1; width: 100%; padding-bottom: 26px; }
.nv-barre { position: absolute; top: 0; inset-inline: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; }
.nv-logo { display: inline-flex; gap: 8px; align-items: center; font-weight: 700; color: #fff; text-shadow: 0 1px 6px rgba(0,0,0,.35); }
.nv-logo img { width: 34px; height: 34px; border-radius: 10px; }
.nv .nv-retour { background: rgba(255,255,255,.18); backdrop-filter: blur(6px); color: #fff; border-radius: 999px; padding: 4px 12px; font-size: .9rem; }
.nv-etiquette { display: inline-block; background: var(--orange); color: #fff; border-radius: 999px; padding: 3px 14px; font-weight: 700; font-size: .9rem; }
.nv-heros h1 { font-size: clamp(2.1rem, 9vw, 3.4rem); margin: 10px 0 6px; text-shadow: 0 2px 18px rgba(0,0,0,.3); }
.nv-heros p { margin: 0 0 16px; font-size: 1.1rem; opacity: .92; }
.nv-chiffres { display: flex; gap: 18px; margin: 0 0 18px; }
.nv-chiffres div { display: grid; }
.nv-chiffres b { font-family: var(--nv-f-titre), sans-serif; font-size: 1.6rem; line-height: 1.2; }
.nv-chiffres small { opacity: .85; font-size: .85rem; }

/* Boutons */
.nv-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 0; cursor: pointer;
  background: var(--orange); color: #fff !important; font: 700 1.15rem/1.2 var(--nv-f-texte), sans-serif; padding: 17px 18px;
  border-radius: 18px; box-shadow: 0 12px 26px -12px rgba(254,114,35,.8); transition: transform .12s ease; }
.nv-btn:active { transform: scale(.98); }
.nv-btn-blanc { background: #fff; color: var(--encre) !important; box-shadow: none; border: 2px solid var(--trait); }
.nv-btn-vert { background: var(--vert); box-shadow: 0 12px 26px -12px rgba(18,138,76,.8); }

/* Sections */
.nv-sec { margin: 38px 0 0; }
.nv-sec > h2 { font-size: 1.6rem; margin-bottom: 14px; }

/* Grille de photos « ce que tu vas coudre » */
.nv-photos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.nv-photo { position: relative; border-radius: 18px; overflow: hidden; aspect-ratio: 4/5; background: #eee; }
.nv-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
.nv-photo:hover img { transform: scale(1.05); }
.nv-photo span { position: absolute; inset-inline: 8px; bottom: 8px; background: rgba(255,255,255,.92); color: var(--encre);
  border-radius: 12px; padding: 4px 10px; font-weight: 700; font-size: .95rem; text-align: center; }
.nv-photos .large { grid-column: span 2; aspect-ratio: 16/10; }

/* Programme : une ligne d'étapes */
.nv-etapes { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
.nv-etape { flex: 0 0 auto; scroll-snap-align: start; background: #fff; border: 1.5px solid var(--trait); border-radius: 14px; padding: 8px 12px;
  font-weight: 700; font-size: .95rem; display: flex; gap: 8px; align-items: center; }
.nv-etape i { font-style: normal; width: 26px; height: 26px; border-radius: 8px; background: var(--violet); color: #fff; display: grid; place-items: center; font-size: .85rem; }
.nv-plus { margin-top: 10px; }
.nv-plus summary { cursor: pointer; color: var(--violet); font-weight: 700; list-style: none; }
.nv-plus summary::-webkit-details-marker { display: none; }
.nv-plus ol { color: var(--doux); font-size: .92rem; padding-inline-start: 20px; }

/* Cartes-photos de choix (en ligne / Sétif / El Eulma) */
.nv-voies { display: grid; gap: 12px; }
.nv-voie { position: relative; border-radius: 22px; overflow: hidden; min-height: 120px; color: #fff; display: grid; align-items: end; cursor: pointer;
  border: 3px solid transparent; transition: border-color .2s ease, transform .2s ease; text-align: start; padding: 0; font: inherit; width: 100%; background: #222; }
.nv-voie img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.nv-voie-ico { position: absolute; top: 8px; inset-inline-end: 14px; font-size: 3.4rem; opacity: .9; }
/* Visuels du cours à faire glisser (carrés de la galerie du LMS) */
.nv-glisse { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 2px 8px; }
.nv-glisse img { flex: 0 0 86%; max-width: 420px; aspect-ratio: 1; object-fit: cover; border-radius: 20px; scroll-snap-align: center;
  box-shadow: 0 10px 24px -16px rgba(30,20,66,.6); background: #fff; }
.nv-voie > div { position: relative; z-index: 1; padding: 14px 16px; display: flex; justify-content: space-between; align-items: end; gap: 10px; width: 100%; }
.nv-voie h3 { font-size: 1.5rem; }
.nv-voie .prix { font-weight: 700; background: rgba(255,255,255,.95); color: var(--encre); border-radius: 12px; padding: 4px 10px; white-space: nowrap; font-size: .95rem; }
.nv-voie[aria-pressed="true"] { border-color: var(--orange); transform: scale(1.01); }

/* Détail d'une voie */
.nv-detail { margin-top: 12px; display: grid; gap: 10px; animation: nv-entre .25s ease; }
@keyframes nv-entre { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.nv-icones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.nv-icones div { background: #fff; border-radius: 16px; padding: 12px 6px; text-align: center; border: 1.5px solid var(--trait); font-weight: 700; font-size: .9rem; line-height: 1.35; }
.nv-icones div span { display: block; font-size: 1.6rem; margin-bottom: 4px; }

/* Groupe : une carte compacte */
.nv-groupe { background: #fff; border-radius: 18px; padding: 14px; border: 1.5px solid var(--trait); display: grid; gap: 8px; }
.nv-groupe-l1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.nv-jour { font-family: var(--nv-f-titre), sans-serif; font-size: 1.35rem; }
.nv-methode { border-radius: 999px; padding: 2px 12px; font-weight: 700; font-size: .88rem; white-space: nowrap; }
.nv-methode[data-m="rapide"] { background: #FFF0E6; color: #B4470A; }
.nv-methode[data-m="longue"] { background: #E8F6EE; color: var(--vert); }
.nv-faits { display: flex; flex-wrap: wrap; gap: 6px; }
.nv-faits span { background: var(--papier); border-radius: 10px; padding: 3px 10px; font-weight: 700; font-size: .92rem; }
.nv-places-barre { display: grid; grid-template-columns: repeat(var(--t), 1fr); gap: 3px; }
.nv-places-barre i { height: 8px; border-radius: 3px; background: #E9E4F5; }
.nv-places-barre i.p { background: var(--rouge); }
.nv-places-txt { font-weight: 700; font-size: .92rem; color: var(--rouge); }

.nv-mini { color: var(--doux); font-size: .9rem; text-align: center; }

/* Barre collante du bas */
.nv-collant { position: fixed; inset-inline: 0; bottom: 0; z-index: 40; padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: rgba(251,246,238,.94); backdrop-filter: blur(8px); border-top: 1.5px solid var(--trait); }
.nv-collant .nv-in { display: flex; gap: 10px; align-items: center; padding: 0; }
.nv-collant .nv-btn { padding: 14px 16px; }
.nv-collant-prix { white-space: nowrap; font-weight: 700; line-height: 1.25; }
.nv-collant-prix small { display: block; color: var(--doux); font-weight: 500; font-size: .78rem; }

/* Hub : cartes niveau */
.nv-niveaux { display: grid; gap: 14px; }
.nv .nv-niveau { position: relative; border-radius: 24px; overflow: hidden; min-height: 300px; color: #fff; display: grid; align-items: end; }
.nv-niveau img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.nv-niveau:hover img { transform: scale(1.04); }
.nv-niveau::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,20,66,0) 15%, rgba(30,20,66,.82) 55%, rgba(30,20,66,.96)); }
.nv-niveau > div { position: relative; z-index: 1; padding: 18px; display: grid; gap: 6px; }
.nv-niveau .rang { position: absolute; top: 14px; inset-inline-start: 14px; z-index: 1; width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center;
  font-family: var(--nv-f-titre), sans-serif; font-size: 1.8rem; color: #fff; }
.nv-niveau h3 { font-size: 1.6rem; }
.nv-niveau .ligne { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.nv-niveau .go { background: var(--orange); border-radius: 999px; padding: 6px 16px; font-weight: 700; white-space: nowrap; }

.nv-pied { text-align: center; color: var(--doux); font-size: .85rem; margin: 36px 0 0; }

@media (min-width: 640px) {
  .nv-photos { grid-template-columns: repeat(3, 1fr); }
  .nv-photos .large { grid-column: span 3; aspect-ratio: 21/9; }
  .nv-voies { grid-template-columns: repeat(var(--n, 3), 1fr); }
}
@media (prefers-reduced-motion: reduce) { .nv * { animation: none !important; transition: none !important; } }
`;

export function NiveauxStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
