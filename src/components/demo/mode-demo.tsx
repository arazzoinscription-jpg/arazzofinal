"use client";

/**
 * MODE DÉMO — pour enregistrer des vidéos tutoriels du site (écran + voix avec Screenity, caméra ici).
 *
 * Activation : ajouter ?demo=1 à l'adresse (ex. formation-arazzo.store/dashboard?demo=1). Le mode reste actif sur
 * toutes les pages de l'onglet (sessionStorage) jusqu'à sa fermeture ; ?demo=0 le coupe.
 * Visiteuses normales (sans ?demo=1) : RIEN ne s'exécute — aucun écouteur, aucun élément ajouté, aucune caméra.
 *
 * Pendant le mode :
 *   • un halo violet (couleur Arazzo) suit la souris, un cercle orange s'agrandit à chaque clic ;
 *   • touche S : demande la caméra (vidéo seule, la voix est enregistrée par Screenity), puis — au même instant —
 *     t = 0 du journal, flash blanc de 150 ms (repère de synchronisation) et début de l'enregistrement caméra ;
 *   • chaque clic, défilement et changement de page est noté avec son t (ms depuis S) ;
 *   • touche E : arrête la caméra (lumière éteinte), télécharge camera.webm PUIS clics.json.
 * Les effets ne bloquent jamais les clics (pointer-events: none) et restent au-dessus de tout (z-index maximal).
 */

import { useEffect } from "react";

const CLE_ACTIF = "arazzo_demo_actif";
const CLE_SESSION = "arazzo_demo_session";
const VIOLET = "91, 22, 249"; // #5B16F9, couleur principale d'Arazzo
const ORANGE = "254, 114, 35"; // #FE7223, couleur contrastée des clics
const Z_MAX = "2147483647";

type Rect = { x: number; y: number; largeur: number; hauteur: number };
type Evenement =
  | { type: "clic"; t: number; x: number; y: number; largeur_fenetre: number; hauteur_fenetre: number; page: string; texte: string; rect: Rect }
  | { type: "defilement"; t: number; page: string; cible: string; x: number; y: number }
  | { type: "page"; t: number; page: string; mode: "debut" | "navigation" | "rechargement" };
type InfosCamera = { fichier: string; debut_ms: number; largeur: number; hauteur: number; fps: number };
type Journal = {
  version: 1;
  site: string;
  debut: string;
  /** Instant de t = 0 (horloge du PC, en ms) : sert à reprendre le journal après un rechargement de page. */
  debut_epoch_ms: number;
  duree_ms?: number;
  fenetre_initiale: { largeur: number; hauteur: number; dpr: number };
  camera: InfosCamera | null;
  /** La page a été rechargée pendant l'enregistrement : la caméra s'est arrêtée à ce t (vidéo perdue). */
  camera_interrompue_ms?: number;
  evenements: Evenement[];
};
type Camera = { flux: MediaStream; enregistreur: MediaRecorder; morceaux: Blob[]; infos: InfosCamera; apercu: HTMLVideoElement };

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const arrondi = (n: number) => Math.round(n);

/** Une frappe dans un champ (nom, e-mail, message…) ne doit jamais déclencher S ou E. */
function estChampDeSaisie(cible: EventTarget | null): boolean {
  const el = cible as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return el.isContentEditable || Boolean(el.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

/** Le texte lisible de l'élément cliqué : aria-label, sinon son texte, sinon valeur / placeholder / alt / title. */
function texteDe(el: HTMLElement): string {
  const brut = el.getAttribute("aria-label")
    || el.innerText
    || (el as HTMLInputElement).value
    || el.getAttribute("placeholder")
    || el.getAttribute("alt")
    || el.getAttribute("title")
    || el.tagName.toLowerCase();
  return brut.replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Démarre tout le mode démo ; renvoie la fonction qui défait tout (écouteurs, éléments, caméra). */
function demarrerModeDemo({ annonce }: { annonce: boolean }): () => void {
  const nettoyages: (() => void)[] = [];
  const ecouter = <K extends keyof WindowEventMap>(type: K, f: (e: WindowEventMap[K]) => void, options?: AddEventListenerOptions) => {
    window.addEventListener(type, f as EventListener, options);
    nettoyages.push(() => window.removeEventListener(type, f as EventListener, options));
  };

  // ── Calque des effets : au-dessus de tout, ne capte AUCUN clic ──
  const racine = document.createElement("div");
  racine.setAttribute("data-mode-demo", "");
  racine.setAttribute("aria-hidden", "true");
  Object.assign(racine.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: Z_MAX, overflow: "hidden" });
  document.body.appendChild(racine);
  nettoyages.push(() => racine.remove());

  // Halo doux (≈ 40 px) qui suit la souris, déplacé à chaque image (léger pour un PC lent).
  const halo = document.createElement("div");
  Object.assign(halo.style, {
    position: "absolute", left: "0", top: "0", width: "40px", height: "40px", borderRadius: "50%",
    background: `rgba(${VIOLET}, 0.28)`, boxShadow: `0 0 18px 6px rgba(${VIOLET}, 0.22)`,
    opacity: "0", transition: "opacity .2s ease", willChange: "transform",
  });
  racine.appendChild(halo);
  let sourisX = -100, sourisY = -100, image = 0;
  const placerHalo = () => { image = 0; halo.style.transform = `translate3d(${sourisX - 20}px, ${sourisY - 20}px, 0)`; };
  ecouter("pointermove", (e) => {
    sourisX = e.clientX; sourisY = e.clientY;
    halo.style.opacity = "1";
    if (!image) image = requestAnimationFrame(placerHalo);
  }, { passive: true });
  ecouter("mouseout", (e) => { if (!e.relatedTarget) halo.style.opacity = "0"; });
  nettoyages.push(() => { if (image) cancelAnimationFrame(image); });

  // Petits messages (en haut, au centre), qui disparaissent seuls.
  const message = (texte: string, ms: number) => {
    const m = document.createElement("div");
    m.textContent = texte;
    Object.assign(m.style, {
      position: "absolute", top: "14px", left: "50%", transform: "translateX(-50%)", maxWidth: "90vw",
      background: "rgba(20, 12, 40, .85)", color: "#fff", font: "600 13px/1.4 system-ui, sans-serif",
      padding: "7px 14px", borderRadius: "999px", textAlign: "center",
    });
    racine.appendChild(m);
    setTimeout(() => m.remove(), ms);
  };

  // Indicateur discret « ● REC » (coin haut-droit) pendant la session.
  const rec = document.createElement("div");
  rec.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e11d48;margin-inline-end:5px;vertical-align:middle"></span>REC`;
  Object.assign(rec.style, {
    position: "absolute", top: "8px", right: "8px", display: "none", opacity: ".8",
    background: "rgba(0,0,0,.35)", color: "#fff", font: "700 10px/1 system-ui, sans-serif", letterSpacing: ".08em",
    padding: "4px 7px", borderRadius: "999px",
  });
  racine.appendChild(rec);

  // ── Journal : en mémoire + copie dans sessionStorage (survit aux changements de page) ──
  let journal: Journal | null = null;
  try { journal = JSON.parse(sessionStorage.getItem(CLE_SESSION) ?? "null") as Journal | null; } catch { journal = null; }
  const t = () => (journal ? Date.now() - journal.debut_epoch_ms : 0);
  let minuteurSauvegarde = 0;
  const sauverMaintenant = () => {
    window.clearTimeout(minuteurSauvegarde);
    try {
      if (journal) sessionStorage.setItem(CLE_SESSION, JSON.stringify(journal));
      else sessionStorage.removeItem(CLE_SESSION);
    } catch { /* mémoire de l'onglet pleine : le journal reste en mémoire jusqu'à E */ }
  };
  const sauver = () => { window.clearTimeout(minuteurSauvegarde); minuteurSauvegarde = window.setTimeout(sauverMaintenant, 400); };
  const noter = (e: Evenement, tout_de_suite = false) => {
    if (!journal) return;
    journal.evenements.push(e);
    if (tout_de_suite) sauverMaintenant(); else sauver();
  };
  ecouter("pagehide", sauverMaintenant);
  nettoyages.push(sauverMaintenant);

  // Changements de page : navigation interne du site (sans rechargement) repérée par l'adresse.
  let derniereAdresse = window.location.href;
  const surveillerPage = window.setInterval(() => {
    if (window.location.href === derniereAdresse) return;
    derniereAdresse = window.location.href;
    noter({ type: "page", t: t(), page: derniereAdresse, mode: "navigation" }, true);
  }, 250);
  nettoyages.push(() => window.clearInterval(surveillerPage));

  // ── Clics : cercle qui s'agrandit (≈ 400 ms) + note dans le journal ──
  ecouter("pointerdown", (e) => {
    if (e.button !== 0) return;
    const cercle = document.createElement("div");
    Object.assign(cercle.style, {
      position: "absolute", left: `${e.clientX - 12}px`, top: `${e.clientY - 12}px`, width: "24px", height: "24px",
      borderRadius: "50%", border: `3px solid rgba(${ORANGE}, .95)`, background: `rgba(${ORANGE}, .18)`,
    });
    racine.appendChild(cercle);
    cercle.animate([{ transform: "scale(.6)", opacity: 1 }, { transform: "scale(3.2)", opacity: 0 }], { duration: 400, easing: "ease-out" })
      .onfinish = () => cercle.remove();

    const cible = e.target as HTMLElement | null;
    if (!journal || !cible || racine.contains(cible) || boutons.contains(cible)) return;
    const el = (cible.closest?.("a, button, [role='button'], [role='link'], [role='tab'], [role='menuitem'], input, select, textarea, label, summary") as HTMLElement | null) ?? cible;
    const r = el.getBoundingClientRect();
    noter({
      type: "clic", t: t(), x: arrondi(e.clientX), y: arrondi(e.clientY),
      largeur_fenetre: window.innerWidth, hauteur_fenetre: window.innerHeight, page: window.location.href,
      texte: texteDe(el), rect: { x: arrondi(r.x), y: arrondi(r.y), largeur: arrondi(r.width), hauteur: arrondi(r.height) },
    }, true); // tout de suite : le clic peut ouvrir une autre page
  }, { capture: true, passive: true });

  // ── Défilements : au plus un relevé toutes les 100 ms par zone, + la position finale ──
  const dernierReleve = new Map<string, number>();
  const finDeDefilement = new Map<string, number>();
  ecouter("scroll", (e) => {
    if (!journal) return;
    const el = e.target;
    const page = el === document || el === document.documentElement || el === document.body;
    const zone = page ? null : (el as HTMLElement);
    const cible = page ? "page" : `${zone!.tagName.toLowerCase()}${zone!.id ? `#${zone!.id}` : ""}${typeof zone!.className === "string" && zone!.className.trim() ? `.${zone!.className.trim().split(/\s+/)[0]}` : ""}`;
    const relever = () => noter({
      type: "defilement", t: t(), page: window.location.href, cible,
      x: arrondi(page ? window.scrollX : zone!.scrollLeft), y: arrondi(page ? window.scrollY : zone!.scrollTop),
    });
    const maintenant = Date.now();
    if (maintenant - (dernierReleve.get(cible) ?? 0) >= 100) { dernierReleve.set(cible, maintenant); relever(); }
    window.clearTimeout(finDeDefilement.get(cible));
    finDeDefilement.set(cible, window.setTimeout(relever, 150));
  }, { capture: true, passive: true });

  // ── Caméra du PC (vidéo seulement) ──
  let camera: Camera | null = null;
  let demarrage = false;

  // Vignette ronde de prévisualisation (bas-gauche, 120 px, semi-transparente, sans bordure) + boutons masquer / afficher.
  // Les boutons sont HORS du calque (qui ne capte aucun clic) pour rester cliquables ; leurs clics ne sont pas notés.
  const boutons = document.createElement("div");
  boutons.setAttribute("data-mode-demo", "");
  Object.assign(boutons.style, { position: "fixed", left: "0", bottom: "0", width: "0", height: "0", zIndex: Z_MAX });
  document.body.appendChild(boutons);
  nettoyages.push(() => boutons.remove());
  const vignette = document.createElement("div");
  Object.assign(vignette.style, {
    position: "absolute", left: "16px", bottom: "16px", width: "120px", height: "120px", borderRadius: "50%",
    overflow: "hidden", opacity: "0.35", border: "none", display: "none", background: "#000",
  });
  racine.appendChild(vignette);
  const bouton = (texte: string, titre: string, style: Partial<CSSStyleDeclaration>) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = texte; b.title = titre; b.setAttribute("aria-label", titre);
    Object.assign(b.style, {
      position: "fixed", display: "none", border: "none", borderRadius: "999px", cursor: "pointer",
      background: "rgba(20, 12, 40, .55)", color: "#fff", font: "600 11px/1 system-ui, sans-serif", padding: "5px 8px", opacity: ".6",
      ...style,
    });
    boutons.appendChild(b);
    return b;
  };
  const masquer = bouton("masquer", "Masquer la vignette caméra (l'enregistrement continue)", { left: "86px", bottom: "128px" });
  const afficher = bouton("📷", "Afficher la vignette caméra", { left: "16px", bottom: "16px" });
  masquer.onclick = () => { vignette.style.display = "none"; masquer.style.display = "none"; afficher.style.display = "block"; };
  afficher.onclick = () => { vignette.style.display = "block"; masquer.style.display = "block"; afficher.style.display = "none"; };

  // Réglages pour un PC lent : 1280×720 et 30 i/s au plus, ~2,5 Mbit/s, webm (vp8 si possible).
  async function ouvrirCamera(): Promise<Camera | null> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return null;
    let flux: MediaStream | null = null;
    try {
      flux = await navigator.mediaDevices.getUserMedia({
        audio: false, // pas de micro : la voix est enregistrée par Screenity
        video: { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 30, max: 30 } },
      });
      const apercu = document.createElement("video");
      apercu.muted = true; apercu.playsInline = true; apercu.autoplay = true;
      Object.assign(apercu.style, { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }); // effet miroir
      apercu.srcObject = flux;
      vignette.replaceChildren(apercu);
      // On attend la première image : les VRAIES dimensions sont alors connues.
      await Promise.race([new Promise((r) => { apercu.onloadedmetadata = r; }), pause(3000)]);
      await apercu.play().catch(() => undefined);
      const reglages = flux.getVideoTracks()[0]?.getSettings() ?? {};
      const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "";
      const enregistreur = new MediaRecorder(flux, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 2_500_000 });
      // Navigateur sans webm (rare) : le fichier garde la bonne extension.
      const extension = (enregistreur.mimeType || type || "video/webm").includes("mp4") ? "mp4" : "webm";
      const morceaux: Blob[] = [];
      enregistreur.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
      return {
        flux, enregistreur, morceaux, apercu,
        infos: {
          fichier: `camera.${extension}`, debut_ms: 0,
          largeur: arrondi(reglages.width ?? apercu.videoWidth), hauteur: arrondi(reglages.height ?? apercu.videoHeight),
          fps: arrondi(reglages.frameRate ?? 30),
        },
      };
    } catch {
      flux?.getTracks().forEach((p) => p.stop()); // accès refusé, pas de caméra, caméra occupée…
      return null;
    }
  }

  /** Éteint complètement la caméra (toutes les pistes : la lumière s'éteint) et retire la vignette. */
  function couperCamera() {
    camera?.flux.getTracks().forEach((p) => p.stop());
    vignette.replaceChildren();
    vignette.style.display = "none"; masquer.style.display = "none"; afficher.style.display = "none";
    camera = null;
  }
  nettoyages.push(couperCamera);

  // Pendant que la caméra enregistre, un rechargement complet la couperait : le navigateur demande confirmation.
  const retenir = (e: BeforeUnloadEvent) => { if (camera) { e.preventDefault(); e.returnValue = ""; } };
  ecouter("beforeunload", retenir);

  async function demarrerSession() {
    demarrage = true;
    message("Caméra : autorisez l'accès si le navigateur le demande…", 2500);
    const cam = await ouvrirCamera();
    const lancer = () => {
      // t = 0 : flash blanc de 150 ms (repère pour caler la vidéo de Screenity) + début du journal.
      const debut = Date.now();
      journal = {
        version: 1, site: window.location.origin, debut: new Date(debut).toISOString(), debut_epoch_ms: debut,
        fenetre_initiale: { largeur: window.innerWidth, hauteur: window.innerHeight, dpr: window.devicePixelRatio || 1 },
        camera: cam ? cam.infos : null, evenements: [],
      };
      const flash = document.createElement("div");
      Object.assign(flash.style, { position: "absolute", inset: "0", background: "#fff" });
      racine.appendChild(flash);
      setTimeout(() => flash.remove(), 150);
      derniereAdresse = window.location.href;
      noter({ type: "page", t: 0, page: derniereAdresse, mode: "debut" }, true);
      rec.style.display = "block";
      demarrage = false;
      setTimeout(() => message("⚠️ ne pas recharger la page pendant l'enregistrement", 4000), 200);
    };
    if (!cam) {
      lancer();
      setTimeout(() => message("caméra indisponible", 3000), 4300);
      return;
    }
    camera = cam;
    vignette.style.display = "block"; masquer.style.display = "block";
    // L'enregistrement caméra et t = 0 commencent ENSEMBLE, à l'événement « start » de l'enregistreur.
    let lance = false;
    const go = () => { if (!lance) { lance = true; lancer(); } };
    cam.enregistreur.addEventListener("start", go, { once: true });
    cam.enregistreur.start(1000); // un morceau par seconde : rien de gros à rassembler à la fin
    setTimeout(go, 1000); // filet de sécurité si le navigateur n'émet pas « start »
  }

  /** Arrête l'enregistreur et rend la vidéo complète. */
  function arreterEnregistreur(cam: Camera): Promise<Blob> {
    return new Promise((resolve) => {
      const fin = () => resolve(new Blob(cam.morceaux, { type: cam.enregistreur.mimeType || "video/webm" }));
      if (cam.enregistreur.state === "inactive") { fin(); return; }
      cam.enregistreur.addEventListener("stop", fin, { once: true });
      cam.enregistreur.stop();
    });
  }

  function telecharger(contenu: Blob, nom: string) {
    const url = URL.createObjectURL(contenu);
    const a = document.createElement("a");
    a.href = url; a.download = nom; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function terminerSession() {
    if (!journal) return;
    const j = journal;
    j.duree_ms = t();
    rec.style.display = "none";
    const cam = camera;
    if (cam) {
      const video = await arreterEnregistreur(cam);
      couperCamera();
      telecharger(video, cam.infos.fichier);
      await pause(800); // laisse le 1er téléchargement partir avant le second
    } else if (j.camera) {
      j.camera = null; // caméra coupée par un rechargement : pas de vidéo à fournir
    }
    telecharger(new Blob([JSON.stringify(j, null, 2)], { type: "application/json" }), "clics.json");
    journal = null;
    sauverMaintenant();
    message("✓ Enregistrement terminé : fichiers téléchargés", 3000);
  }

  // ── Touches S (démarrer) et E (terminer), jamais pendant une frappe dans un champ ──
  ecouter("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || estChampDeSaisie(e.target)) return;
    const touche = e.code === "KeyS" || e.key.toLowerCase() === "s" ? "S" : e.code === "KeyE" || e.key.toLowerCase() === "e" ? "E" : null;
    if (touche === "S" && !journal && !demarrage) { e.preventDefault(); void demarrerSession(); }
    if (touche === "E" && journal && !demarrage) { e.preventDefault(); void terminerSession(); }
  });

  // ── Reprise après un RECHARGEMENT complet de page pendant une session ──
  if (journal) {
    rec.style.display = "block";
    // (Une seule note par chargement, même si le composant est monté deux fois de suite.)
    const dernier = journal.evenements[journal.evenements.length - 1];
    const dejaNote = dernier?.type === "page" && dernier.mode === "rechargement" && dernier.page === window.location.href && t() - dernier.t < 2000;
    if (!dejaNote) noter({ type: "page", t: t(), page: window.location.href, mode: "rechargement" }, true);
    if (journal.camera && journal.camera_interrompue_ms === undefined) {
      journal.camera_interrompue_ms = t();
      sauverMaintenant();
      message("⚠️ Page rechargée : la caméra s'est arrêtée (les clics continuent). Appuyez sur E pour terminer.", 6000);
    }
  } else if (annonce) {
    message("Mode démo actif · S = démarrer · E = terminer", 3500);
  }

  return () => { nettoyages.reverse().forEach((f) => { try { f(); } catch { /* déjà défait */ } }); };
}

/** À placer UNE fois dans le gabarit racine : sans ?demo=1 (ou session démo de l'onglet), ne fait strictement rien. */
export default function ModeDemo() {
  useEffect(() => {
    let annonce = false;
    try {
      const demo = new URLSearchParams(window.location.search).get("demo");
      if (demo === "0") { sessionStorage.removeItem(CLE_ACTIF); sessionStorage.removeItem(CLE_SESSION); return undefined; }
      if (demo === "1") { sessionStorage.setItem(CLE_ACTIF, "1"); annonce = true; }
      if (sessionStorage.getItem(CLE_ACTIF) !== "1") return undefined;
    } catch {
      return undefined; // stockage indisponible (navigation privée stricte) : pas de mode démo
    }
    return demarrerModeDemo({ annonce });
  }, []);
  return null;
}
