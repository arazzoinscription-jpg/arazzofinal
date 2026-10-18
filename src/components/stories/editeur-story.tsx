"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, BarChart3, Camera, Check, HelpCircle, Link2, Loader2, Minus, Palette,
  Pencil, Plus, Smile, Timer, Trash2, Type, Undo2, Video, X, Aperture, Clapperboard,
} from "lucide-react";
import { AUTOCOLLANTS, COULEURS, FONDS, MAX_CALQUES, MAX_POINTS, lienAutorise, type Calque } from "@/lib/stories/calques";
import { DUREE_STORY_MAX_S, PHOTO_STORY_MAX_OCTETS, VIDEO_LONGUE_MAX_S, decouperVideo, dureeLisible, verifierPhotoStory, type PartieVideo } from "@/lib/stories/regles";
import { detecterContexte } from "@/lib/autorisations-media";
import { compresserImage } from "@/components/messaging/pieces";
import { CameraStory } from "./camera-story";
import { demarrerStoryVideo, finaliserStoryVideo, finaliserStoryVideoLongue, publierStoryPhoto, publierStoryTexte } from "@/app/actions/stories";
import { ContenuCalque, Dessins, FondStory, RATIO, STYLE_CADRE, ZONE_CADRE, styleTexte } from "./rendu-calques";
import { MESSAGE_EN_ATTENTE } from "@/lib/visiteuses/regles";

type Source =
  | { kind: "image"; fichier: File; url: string }
  /** `parties` : plus d'une si la vidéo dépasse 30 s (elle devient plusieurs stories à la suite). */
  | { kind: "video"; fichier: File; url: string; duree: number; parties: PartieVideo[] }
  | { kind: "texte" };
type Positionne = Exclude<Calque, { type: "dessin" }>;
type Brouillon = { id: string | null; texte: string; couleur: string; fond: "aucun" | "plein" | "doux"; align: "gauche" | "centre" | "droite"; taille: number };
type Formulaire =
  | { type: "question"; id: string | null; question: string }
  | { type: "sondage"; id: string | null; question: string; a: string; b: string }
  | { type: "compte"; id: string | null; titre: string; fin: string }
  | { type: "lien"; id: string | null; texte: string; url: string };
type Geste =
  | { type: "glisser"; id: string; dx: number; dy: number; x0: number; y0: number; bouge: boolean; dejaChoisi: boolean }
  | { type: "pincer"; id: string; d0: number; t0: number };

const nouvelId = () => `k${Math.random().toString(36).slice(2, 10)}`;
/** Hauteur d'un nouvel élément : décalée selon le nombre déjà posés (jamais tous empilés au centre). */
const hauteurNouvelle = (n: number) => [0.5, 0.32, 0.68, 0.2, 0.8][n % 5];
const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const arrondi = (v: number) => Math.round(v * 1000) / 1000;

/** « 2026-10-17T18:00 » (heure locale) pour un champ date-heure. */
function versChampLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Prévient la page (le feed coupe le son de ses vidéos) qu'une story occupe l'écran. */
export function signalerPleinEcran(ouvert: boolean) {
  window.dispatchEvent(new CustomEvent("arazzo:story-plein-ecran", { detail: ouvert }));
}

/**
 * Créer une story « comme Instagram » : photo, vidéo (plus de 30 s → découpée en plusieurs stories publiées
 * ensemble) ou texte seul sur un fond, puis
 * texte, dessin au doigt, autocollants, question, sondage, compte à rebours et lien.
 * Chaque élément se déplace au doigt, s'agrandit (pincer, molette ou −/+) et se jette dans la corbeille.
 */
export function EditeurStory({ equipe = false, onFermer }: { equipe?: boolean; onFermer: () => void }) {
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [fond, setFond] = useState<string>(FONDS[0]);
  const [calques, setCalques] = useState<Calque[]>([]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "texte" | "dessin" | "autocollants">(null);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [form, setForm] = useState<Formulaire | null>(null);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const [pinceau, setPinceau] = useState({ couleur: "#FFFFFF", epaisseur: 0.012 });
  const [trait, setTrait] = useState<[number, number][] | null>(null);
  const [legende, setLegende] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [glisse, setGlisse] = useState(false);
  const [surCorbeille, setSurCorbeille] = useState(false);
  const cadre = useRef<HTMLDivElement>(null);
  const corbeille = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const champPhotoCam = useRef<HTMLInputElement>(null);
  const champVideoCam = useRef<HTMLInputElement>(null);
  const [cameraPc, setCameraPc] = useState(false);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<Geste | null>(null);
  const urlMedia = source && source.kind !== "texte" ? source.url : null;

  // Plein écran : la page ne défile plus, le feed se tait ; Échap ferme.
  useEffect(() => {
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    signalerPleinEcran(true);
    return () => { document.body.style.overflow = ancien; signalerPleinEcran(false); };
  }, []);
  useEffect(() => () => { if (urlMedia) URL.revokeObjectURL(urlMedia); }, [urlMedia]);

  const pointsUtilises = useMemo(() => calques.reduce((n, c) => n + (c.type === "dessin" ? c.points.length : 0), 0), [calques]);
  const selection = calques.find((c) => c.id === choisi && c.type !== "dessin") as Positionne | undefined;

  function fermer() {
    if (envoi !== null) return;
    if (calques.length && !confirm("Abandonner cette story ?")) return;
    onFermer();
  }

  async function choisirFichier(brut: File | null) {
    setErreur(null);
    if (!brut) return;
    // Photo de l'appareil photo du téléphone (souvent plus de 8 Mo) : allégée avant l'envoi.
    const f = brut.type.startsWith("image/") && brut.size > PHOTO_STORY_MAX_OCTETS ? await compresserImage(brut, 2160, 0.88) : brut;
    const url = URL.createObjectURL(f);
    if (f.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const d = decouperVideo(v.duration);
        if (!d.ok) { setErreur(d.erreur); URL.revokeObjectURL(url); return; }
        setSource({ kind: "video", fichier: f, url, duree: d.duree, parties: d.parties });
      };
      v.onerror = () => { setErreur("Impossible de lire cette vidéo."); URL.revokeObjectURL(url); };
      v.src = url;
      return;
    }
    const pb = verifierPhotoStory({ type: f.type, size: f.size });
    if (pb) { setErreur(pb); URL.revokeObjectURL(url); return; }
    setSource({ kind: "image", fichier: f, url });
  }

  /** 🎥 Filmer / 📸 Prendre une photo : l'appareil photo du téléphone ; sur ordinateur, la caméra dans la page. */
  function cameraDirecte(type: "photo" | "video") {
    setErreur(null);
    if (detecterContexte(navigator.userAgent).appareil === "pc") { setCameraPc(true); return; }
    const c = type === "photo" ? champPhotoCam.current : champVideoCam.current;
    if (!c) return;
    c.value = "";
    c.click();
  }

  /** Vidéo filmée dans la page (ordinateur) : sa durée est connue, elle part directement dans l'éditeur. */
  function videoFilmee(f: File, duree: number) {
    setCameraPc(false);
    const d = decouperVideo(duree);
    if (!d.ok) { setErreur(d.erreur); return; }
    setSource({ kind: "video", fichier: f, url: URL.createObjectURL(f), duree: d.duree, parties: d.parties });
  }

  function ouvrirFichier(accept: string) {
    if (!champ.current) return;
    champ.current.accept = accept;
    champ.current.value = "";
    champ.current.click();
  }

  // ── Calques ──────────────────────────────────────────────────────────────
  function ajouter(c: Calque) {
    if (calques.length >= MAX_CALQUES) { setErreur(`${MAX_CALQUES} éléments au plus sur une story.`); return false; }
    setErreur(null);
    setCalques((l) => [...l, c]);
    if (c.type !== "dessin") setChoisi(c.id);
    return true;
  }
  function remplacer(c: Calque) { setCalques((l) => l.map((x) => (x.id === c.id ? c : x))); }
  function retirer(id: string) { setCalques((l) => l.filter((x) => x.id !== id)); setChoisi(null); }
  function changerTaille(id: string, delta: number) {
    setCalques((l) => l.map((c) => (c.id === id && c.type !== "dessin" ? { ...c, taille: Math.round(borne(c.taille + delta, 0.5, 3) * 100) / 100 } : c)));
  }

  /** Rouvrir un élément pour le modifier (texte, question, sondage, compte à rebours, lien). */
  function modifier(id: string) {
    const c = calques.find((x) => x.id === id);
    if (!c) return;
    if (c.type === "texte") { setBrouillon({ id: c.id, texte: c.texte, couleur: c.couleur, fond: c.fond, align: c.align, taille: c.taille }); setMode("texte"); }
    if (c.type === "question") setForm({ type: "question", id: c.id, question: c.question });
    if (c.type === "sondage") setForm({ type: "sondage", id: c.id, question: c.question, a: c.choix[0], b: c.choix[1] });
    if (c.type === "compte") setForm({ type: "compte", id: c.id, titre: c.titre, fin: versChampLocal(new Date(c.fin)) });
    if (c.type === "lien") setForm({ type: "lien", id: c.id, texte: c.texte, url: c.url });
    setErreurForm(null);
  }

  function nouveauTexte(surFond = source?.kind === "texte") {
    setChoisi(null);
    setBrouillon({ id: null, texte: "", couleur: "#FFFFFF", fond: surFond ? "aucun" : "doux", align: "centre", taille: 1 });
    setMode("texte");
  }

  function validerTexte() {
    const b = brouillon;
    setMode(null); setBrouillon(null);
    if (!b) return;
    const t = b.texte.replace(/[^\S\n]+/g, " ").trim().slice(0, 200);
    const ancien = b.id ? (calques.find((c) => c.id === b.id) as Positionne | undefined) : undefined;
    if (!t) { if (ancien) retirer(ancien.id); return; }
    const c: Calque = { id: b.id ?? nouvelId(), type: "texte", texte: t, couleur: b.couleur, fond: b.fond, align: b.align, taille: b.taille, x: ancien?.x ?? 0.5, y: ancien?.y ?? 0.4 };
    if (ancien) remplacer(c); else ajouter(c);
  }

  function ouvrirFormulaire(type: Formulaire["type"]) {
    setMode(null); setErreurForm(null); setChoisi(null);
    if (type === "question") setForm({ type, id: null, question: "Posez-moi une question !" });
    if (type === "sondage") setForm({ type, id: null, question: "", a: "Oui", b: "Non" });
    if (type === "compte") {
      const d = new Date(Date.now() + 86_400_000);
      d.setMinutes(0, 0, 0);
      setForm({ type, id: null, titre: "Prochain cours", fin: versChampLocal(d) });
    }
    if (type === "lien") setForm({ type, id: null, texte: "", url: "" });
  }

  function validerFormulaire() {
    const f = form;
    if (!f) return;
    const ancien = f.id ? (calques.find((c) => c.id === f.id) as Positionne | undefined) : undefined;
    const base = { id: f.id ?? nouvelId(), x: ancien?.x ?? 0.5, y: ancien?.y ?? hauteurNouvelle(calques.length), taille: ancien?.taille ?? 1 };
    let c: Calque | null = null;
    if (f.type === "question") {
      if (!f.question.trim()) return setErreurForm("Écrivez votre question.");
      c = { ...base, type: "question", question: f.question.trim().slice(0, 120) };
    } else if (f.type === "sondage") {
      if (!f.question.trim() || !f.a.trim() || !f.b.trim()) return setErreurForm("Écrivez la question et les deux réponses.");
      c = { ...base, type: "sondage", question: f.question.trim().slice(0, 120), choix: [f.a.trim().slice(0, 40), f.b.trim().slice(0, 40)] };
    } else if (f.type === "compte") {
      const fin = new Date(f.fin);
      const ms = fin.getTime() - Date.now();
      if (!f.titre.trim()) return setErreurForm("Donnez un titre (ex. « Prochain cours »).");
      if (Number.isNaN(ms) || ms < 120_000) return setErreurForm("Choisissez une date à venir.");
      if (ms > 30 * 86_400_000) return setErreurForm("30 jours au plus.");
      c = { ...base, type: "compte", titre: f.titre.trim().slice(0, 60), fin: fin.toISOString() };
    } else {
      const url = lienAutorise(f.url, equipe);
      if (!url) return setErreurForm(equipe ? "Adresse invalide : une page du site (/communaute) ou une adresse https://…" : "Choisissez une page du site Arazzo, par exemple /communaute ou /formation/niveau-1.");
      c = { ...base, type: "lien", texte: f.texte.trim().slice(0, 40) || "Voir", url };
    }
    setForm(null);
    if (ancien) remplacer(c); else ajouter(c);
  }

  // ── Gestes sur le cadre : glisser, pincer, corbeille ──────────────────────
  function fraction(x: number, y: number) {
    const r = cadre.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: 0.5, y: 0.5 };
    return { x: (x - r.left) / r.width, y: (y - r.top) / r.height };
  }
  function dansCorbeille(x: number, y: number) {
    const r = corbeille.current?.getBoundingClientRect();
    return Boolean(r && x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24);
  }

  function surAppui(e: React.PointerEvent<HTMLDivElement>) {
    if (mode || envoi !== null) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.current.size === 1) {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-calque]");
      const c = el ? (calques.find((x) => x.id === el.dataset.calque && x.type !== "dessin") as Positionne | undefined) : undefined;
      if (!c) { setChoisi(null); geste.current = null; return; }
      const p = fraction(e.clientX, e.clientY);
      geste.current = { type: "glisser", id: c.id, dx: c.x - p.x, dy: c.y - p.y, x0: e.clientX, y0: e.clientY, bouge: false, dejaChoisi: choisi === c.id };
      setChoisi(c.id);
      cadre.current?.setPointerCapture(e.pointerId);
    } else if (pointeurs.current.size === 2 && geste.current) {
      const [a, b] = [...pointeurs.current.values()];
      const c = calques.find((x) => x.id === geste.current?.id) as Positionne | undefined;
      if (c) geste.current = { type: "pincer", id: c.id, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, t0: c.taille };
      cadre.current?.setPointerCapture(e.pointerId);
      setGlisse(false); setSurCorbeille(false);
    }
  }

  function surDeplacement(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = geste.current;
    if (!g) return;
    if (g.type === "glisser") {
      if (!g.bouge && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 6) return;
      g.bouge = true;
      setGlisse(true);
      const p = fraction(e.clientX, e.clientY);
      const x = arrondi(borne(p.x + g.dx, 0.03, 0.97));
      const y = arrondi(borne(p.y + g.dy, 0.03, 0.97));
      setCalques((l) => l.map((c) => (c.id === g.id && c.type !== "dessin" ? { ...c, x, y } : c)));
      setSurCorbeille(dansCorbeille(e.clientX, e.clientY));
    } else {
      const [a, b] = [...pointeurs.current.values()];
      if (!a || !b) return;
      const t = Math.round(borne(g.t0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), 0.5, 3) * 100) / 100;
      setCalques((l) => l.map((c) => (c.id === g.id && c.type !== "dessin" ? { ...c, taille: t } : c)));
    }
  }

  function surRelache(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointeurs.current.delete(e.pointerId)) return;
    const g = geste.current;
    if (g?.type === "glisser") {
      if (g.bouge && dansCorbeille(e.clientX, e.clientY)) retirer(g.id);
      else if (!g.bouge && g.dejaChoisi) modifier(g.id);
    }
    if (g?.type === "pincer" || pointeurs.current.size === 0) geste.current = null;
    setGlisse(false); setSurCorbeille(false);
  }

  // ── Dessin au doigt ──────────────────────────────────────────────────────
  function dessinAppui(e: React.PointerEvent<HTMLDivElement>) {
    if (MAX_POINTS - pointsUtilises < 2) { setErreur("Le dessin est complet : publiez ou effacez un trait."); return; }
    const p = fraction(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setTrait([[arrondi(borne(p.x, 0, 1)), arrondi(borne(p.y, 0, 1))]]);
  }
  function dessinDeplacement(e: React.PointerEvent<HTMLDivElement>) {
    if (!trait) return;
    const p = fraction(e.clientX, e.clientY);
    const point: [number, number] = [arrondi(borne(p.x, 0, 1)), arrondi(borne(p.y, 0, 1))];
    setTrait((t) => {
      if (!t || t.length >= MAX_POINTS - pointsUtilises) return t;
      const d = t[t.length - 1];
      return Math.hypot(point[0] - d[0], (point[1] - d[1]) / RATIO) < 0.004 ? t : [...t, point];
    });
  }
  function dessinFin() {
    if (trait && trait.length >= 2) ajouter({ id: nouvelId(), type: "dessin", couleur: pinceau.couleur, epaisseur: pinceau.epaisseur, points: trait });
    setTrait(null);
  }
  function annulerTrait() {
    const dernier = [...calques].reverse().find((c) => c.type === "dessin");
    if (dernier) setCalques((l) => l.filter((c) => c.id !== dernier.id));
  }

  // ── Publication ──────────────────────────────────────────────────────────
  /** Compte sans formation : la story attend la validation de l'équipe (on le dit avant de fermer). */
  function termine(enAttente?: boolean) {
    if (enAttente) alert(MESSAGE_EN_ATTENTE);
    router.refresh(); onFermer();
  }

  async function publier() {
    if (!source || envoi !== null) return;
    setErreur(null); setChoisi(null);
    if (source.kind === "texte") {
      if (!calques.length) { setErreur("Ajoutez au moins un texte, un dessin ou un autocollant."); return; }
      setEnvoi(0);
      const r = await publierStoryTexte({ fond, calques });
      setEnvoi(null);
      if (!r.ok) { setErreur(r.erreur); return; }
      termine(r.enAttente);
      return;
    }
    setEnvoi(0);
    if (source.kind === "image") {
      const fd = new FormData();
      fd.append("photo", source.fichier);
      fd.append("legende", legende);
      fd.append("calques", JSON.stringify(calques));
      const r = await publierStoryPhoto(fd);
      setEnvoi(null);
      if (!r.ok) { setErreur(r.erreur); return; }
      termine(r.enAttente);
      return;
    }
    const d = await demarrerStoryVideo({ parties: source.parties.length });
    if (!d.ok) { setErreur(d.erreur); setEnvoi(null); return; }
    const video = source;
    const up = new tus.Upload(video.fichier, {
      endpoint: d.tus.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { AuthorizationSignature: d.tus.signature, AuthorizationExpire: String(d.tus.expire), VideoId: d.tus.videoId, LibraryId: d.tus.libraryId },
      metadata: { filetype: video.fichier.type, title: "Story" },
      onError: () => { setErreur("Échec de l'envoi de la vidéo, réessayez."); setEnvoi(null); },
      onProgress: (envoye, total) => setEnvoi(Math.round((envoye / total) * 100)),
      onSuccess: async () => {
        const f = video.parties.length > 1
          ? await finaliserStoryVideoLongue({ videoId: d.videoId, duree: video.duree, legende, calques })
          : await finaliserStoryVideo({ videoId: d.videoId, duree: video.duree, legende, calques });
        setEnvoi(null);
        if (!f.ok) { setErreur(f.erreur); return; }
        termine(f.enAttente);
      },
    });
    up.start();
  }

  const bouton = "w-10 h-10 grid place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60 disabled:opacity-40";
  const bas = "pb-[max(12px,env(safe-area-inset-bottom))]";

  // ── Écran 1 : choisir le fond de la story ─────────────────────────────────
  if (!source) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Nouvelle story" className="fixed inset-0 z-[85] bg-[#0b0818] text-white flex flex-col">
        <div className="flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2">
          <h2 className="font-semibold text-lg">Nouvelle story</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className={`ms-auto ${bouton}`}><X size={20} /></button>
        </div>
        <input ref={champ} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => void choisirFichier(e.target.files?.[0] ?? null)} />
        {/* L'appareil photo du téléphone, directement (caméra arrière ; on peut basculer dans l'appareil photo). */}
        <input ref={champPhotoCam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void choisirFichier(e.target.files?.[0] ?? null)} />
        <input ref={champVideoCam} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => void choisirFichier(e.target.files?.[0] ?? null)} />
        {cameraPc ? <CameraStory maxS={VIDEO_LONGUE_MAX_S} onFermer={() => setCameraPc(false)} onPhoto={(f) => { setCameraPc(false); void choisirFichier(f); }} onVideo={videoFilmee} /> : null}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="grid grid-cols-3 gap-3 w-full max-w-md">
            <button type="button" onClick={() => ouvrirFichier("image/*")} className="rounded-3xl bg-white/10 hover:bg-white/15 aspect-[3/4] flex flex-col items-center justify-center gap-2">
              <Camera size={30} className="text-[#c4b0ff]" aria-hidden /><span className="text-sm font-semibold">Photo</span>
            </button>
            <button type="button" onClick={() => ouvrirFichier("video/*")} className="rounded-3xl bg-white/10 hover:bg-white/15 aspect-[3/4] flex flex-col items-center justify-center gap-2">
              <Video size={30} className="text-[#FE7223]" aria-hidden /><span className="text-sm font-semibold">Vidéo</span>
              <span className="-mt-1.5 px-2 text-center text-[10px] leading-tight text-white/55">longue ? découpée en stories de {DUREE_STORY_MAX_S} s</span>
            </button>
            <button type="button" onClick={() => { setSource({ kind: "texte" }); nouveauTexte(true); }} className="rounded-3xl aspect-[3/4] flex flex-col items-center justify-center gap-2" style={{ background: FONDS[0] }}>
              <Type size={30} aria-hidden /><span className="text-sm font-semibold">Texte</span>
            </button>
          </div>
          {/* La caméra en direct */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            <button type="button" onClick={() => cameraDirecte("video")} className="rounded-2xl bg-gradient-to-br from-[#FE7223] to-[#e1306c] hover:opacity-95 py-4 flex items-center justify-center gap-2 font-semibold">
              <Clapperboard size={22} aria-hidden /> Filmer
            </button>
            <button type="button" onClick={() => cameraDirecte("photo")} className="rounded-2xl bg-white/10 hover:bg-white/15 py-4 flex items-center justify-center gap-2 font-semibold">
              <Aperture size={22} aria-hidden /> Prendre une photo
            </button>
          </div>
          <p className="text-sm text-white/60 text-center max-w-sm">Ensuite : écrivez dessus, dessinez au doigt, ajoutez des autocollants, une question, un sondage, un compte à rebours ou un lien. Visible 24 h dans La Cour, puis dans l’« Historique Stories » de votre profil (vous pouvez la supprimer à tout moment).</p>
          {erreur ? <p className="rounded-xl bg-red-500/15 border border-red-400/30 px-3 py-2 text-sm text-red-200">{erreur}</p> : null}
        </div>
      </div>
    );
  }

  // ── Écran 2 : l'éditeur ───────────────────────────────────────────────────
  const palette = (valeur: string, choisir: (c: string) => void) => (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {COULEURS.map((c) => (
        <button key={c} type="button" onClick={() => choisir(c)} aria-label={`Couleur ${c}`}
          className={`w-8 h-8 rounded-full border-2 ${valeur === c ? "border-white scale-110" : "border-white/40"}`} style={{ background: c }} />
      ))}
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Créer une story" className="fixed inset-0 z-[85] bg-black text-white flex flex-col select-none">
      {/* Barre du haut : selon l'outil en cours */}
      <div className="relative z-20 flex items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2">
        {mode === "texte" && brouillon ? (
          <>
            <button type="button" className={bouton} aria-label="Alignement" onClick={() => setBrouillon({ ...brouillon, align: brouillon.align === "centre" ? "gauche" : brouillon.align === "gauche" ? "droite" : "centre" })}>
              {brouillon.align === "gauche" ? <AlignLeft size={18} /> : brouillon.align === "droite" ? <AlignRight size={18} /> : <AlignCenter size={18} />}
            </button>
            <button type="button" className={bouton} aria-label="Fond du texte" onClick={() => setBrouillon({ ...brouillon, fond: brouillon.fond === "aucun" ? "plein" : brouillon.fond === "plein" ? "doux" : "aucun" })}>
              <span className={`text-sm font-black px-1 rounded ${brouillon.fond === "plein" ? "bg-white text-black" : brouillon.fond === "doux" ? "bg-white/30" : ""}`}>A</span>
            </button>
            <button type="button" onClick={validerTexte} className="ms-auto rounded-full bg-white text-black px-4 py-2 text-sm font-bold">Terminé</button>
          </>
        ) : mode === "dessin" ? (
          <>
            <button type="button" className={bouton} aria-label="Effacer le dernier trait" onClick={annulerTrait} disabled={!calques.some((c) => c.type === "dessin")}><Undo2 size={18} /></button>
            {[0.006, 0.012, 0.024].map((ep) => (
              <button key={ep} type="button" aria-label={`Épaisseur ${ep}`} onClick={() => setPinceau({ ...pinceau, epaisseur: ep })}
                className={`${bouton} ${pinceau.epaisseur === ep ? "ring-2 ring-white" : ""}`}>
                <span className="block rounded-full bg-white" style={{ width: ep * 900, height: ep * 900 }} />
              </button>
            ))}
            <button type="button" onClick={() => setMode(null)} className="ms-auto rounded-full bg-white text-black px-4 py-2 text-sm font-bold">Terminé</button>
          </>
        ) : (
          <>
            <button type="button" className={bouton} aria-label="Retour" onClick={() => { if (calques.length && !confirm("Recommencer ? Les éléments ajoutés seront effacés.")) return; setCalques([]); setChoisi(null); setSource(null); setErreur(null); }}><ArrowLeft size={20} /></button>
            <div className="flex-1" />
            {source.kind === "texte" ? (
              <button type="button" className={bouton} aria-label="Changer le fond" onClick={() => setFond(FONDS[(FONDS.indexOf(fond as (typeof FONDS)[number]) + 1) % FONDS.length])}><Palette size={18} /></button>
            ) : null}
            <button type="button" className={bouton} aria-label="Écrire un texte" onClick={() => nouveauTexte()}><Type size={19} /></button>
            <button type="button" className={bouton} aria-label="Dessiner" onClick={() => { setChoisi(null); setMode("dessin"); }}><Pencil size={18} /></button>
            <button type="button" className={bouton} aria-label="Autocollants, question, sondage…" onClick={() => { setChoisi(null); setMode("autocollants"); }}><Smile size={19} /></button>
            <button type="button" className={bouton} aria-label="Fermer" onClick={fermer}><X size={20} /></button>
          </>
        )}
      </div>

      {/* Le cadre 9:16 */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2" style={ZONE_CADRE}>
        <div ref={cadre} className="relative overflow-hidden rounded-2xl bg-[#111] touch-none" style={STYLE_CADRE}
          onPointerDown={surAppui} onPointerMove={surDeplacement} onPointerUp={surRelache} onPointerCancel={surRelache}
          onWheel={(e) => { if (choisi && !mode) changerTaille(choisi, e.deltaY < 0 ? 0.08 : -0.08); }}>
          <FondStory kind={source.kind} url={urlMedia} fond={fond} alt="Aperçu de la story" />
          <Dessins calques={calques} enCours={trait ? { ...pinceau, points: trait } : null} />
          {calques.map((c) => {
            if (c.type === "dessin" || (mode === "texte" && brouillon?.id === c.id)) return null;
            return (
              <div key={c.id} data-calque={c.id} className={`absolute z-10 w-max max-w-[92cqw] cursor-move rounded-xl ${choisi === c.id ? "outline outline-2 outline-dashed outline-white/90 outline-offset-4" : ""}`}
                style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: "translate(-50%, -50%)" }}>
                <div className="pointer-events-none"><ContenuCalque c={c} /></div>
              </div>
            );
          })}

          {/* Écrire */}
          {mode === "texte" && brouillon ? (
            <div className="absolute inset-0 z-30 bg-black/55 flex items-center justify-center p-[5cqw]" onPointerDown={(e) => e.stopPropagation()}>
              <textarea autoFocus value={brouillon.texte} onChange={(e) => setBrouillon({ ...brouillon, texte: e.target.value.slice(0, 200) })} rows={3}
                placeholder="Écrivez…" aria-label="Texte de la story"
                className="w-full bg-transparent outline-none resize-none font-bold leading-tight placeholder:text-white/50 rounded-[1.5cqw] px-[2cqw] py-[1cqw] [field-sizing:content]"
                style={{ ...styleTexte(brouillon), fontSize: `${6 * brouillon.taille}cqw`, textAlign: brouillon.align === "gauche" ? "left" : brouillon.align === "droite" ? "right" : "center" }} />
            </div>
          ) : null}

          {/* Dessiner */}
          {mode === "dessin" ? (
            <div className="absolute inset-0 z-30 touch-none cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); dessinAppui(e); }}
              onPointerMove={dessinDeplacement} onPointerUp={dessinFin} onPointerCancel={dessinFin} aria-label="Zone de dessin" />
          ) : null}

          {/* Corbeille : glisser un élément dessus pour le supprimer */}
          {glisse ? (
            <div ref={corbeille} className={`absolute z-20 bottom-[4cqw] start-1/2 -translate-x-1/2 w-14 h-14 rounded-full grid place-items-center transition ${surCorbeille ? "bg-red-600 scale-125" : "bg-black/60 border border-white/40"}`} aria-hidden>
              <Trash2 size={22} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Barre du bas */}
      <div className={`relative z-20 px-3 pt-2 ${bas} space-y-2`}>
        {mode === "texte" && brouillon ? (
          <>
            {palette(brouillon.couleur, (c) => setBrouillon({ ...brouillon, couleur: c }))}
            <label className="flex items-center gap-3 max-w-sm mx-auto text-xs text-white/70">
              Taille
              <input type="range" min={0.6} max={2.5} step={0.05} value={brouillon.taille} onChange={(e) => setBrouillon({ ...brouillon, taille: Number(e.target.value) })} className="flex-1 accent-white" />
            </label>
          </>
        ) : mode === "dessin" ? (
          palette(pinceau.couleur, (c) => setPinceau({ ...pinceau, couleur: c }))
        ) : (
          <>
            {selection ? (
              <div className="flex items-center justify-center gap-2">
                <button type="button" className={bouton} aria-label="Plus petit" onClick={() => changerTaille(selection.id, -0.15)}><Minus size={18} /></button>
                <button type="button" className={bouton} aria-label="Plus grand" onClick={() => changerTaille(selection.id, 0.15)}><Plus size={18} /></button>
                {selection.type !== "emoji" ? <button type="button" onClick={() => modifier(selection.id)} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Modifier</button> : null}
                <button type="button" className={`${bouton} !bg-red-600/80`} aria-label="Supprimer cet élément" onClick={() => retirer(selection.id)}><Trash2 size={17} /></button>
              </div>
            ) : (
              <p className="text-center text-[11px] text-white/50">{calques.length ? "Glissez pour déplacer · pincez ou −/+ pour la taille · jetez sur la corbeille pour supprimer" : "Touchez Aa, ✏️ ou 🙂 pour décorer votre story"}</p>
            )}
            {source.kind === "video" && source.parties.length > 1 ? (
              <p className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[13px] text-white/85 text-center">
                ✂️ Vidéo de {dureeLisible(source.duree)} → <strong>{source.parties.length} stories</strong> de {DUREE_STORY_MAX_S} s au plus, publiées ensemble, à la suite.
                {calques.some((c) => c.type === "question" || c.type === "sondage" || c.type === "compte") ? " Question, sondage et compte à rebours : sur la 1re." : ""}
              </p>
            ) : null}
            {erreur ? <p className="rounded-xl bg-red-500/20 border border-red-400/30 px-3 py-2 text-sm text-red-100 text-center">{erreur}</p> : null}
            <div className="flex gap-2 max-w-md mx-auto">
              {source.kind !== "texte" ? (
                <input value={legende} onChange={(e) => setLegende(e.target.value)} maxLength={150} placeholder="Une légende (facultatif)"
                  className="flex-1 min-w-0 rounded-full bg-white/10 border border-white/15 px-4 py-2.5 text-sm placeholder:text-white/40 outline-none focus:border-white/40" />
              ) : <div className="flex-1" />}
              <button type="button" onClick={publier} disabled={envoi !== null}
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#5B16F9] to-[#FE7223] px-5 py-2.5 text-sm font-bold disabled:opacity-50">
                {envoi !== null ? <><Loader2 size={16} className="animate-spin" aria-hidden /> {envoi ? `${envoi} %` : "Envoi…"}</> : <><Check size={16} aria-hidden /> {source.kind === "video" && source.parties.length > 1 ? `Publier les ${source.parties.length}` : "Publier"}</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Autocollants et stickers interactifs */}
      {mode === "autocollants" ? (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={() => setMode(null)}>
          <div className={`w-full max-h-[70vh] overflow-y-auto rounded-t-3xl bg-[#1a1430] px-4 pt-3 ${bas}`} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" aria-hidden />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {([
                ["question", "Question", HelpCircle, "from-[#5B16F9] to-[#FE7223]"],
                ["sondage", "Sondage", BarChart3, "from-[#0EA5E9] to-[#5B16F9]"],
                ["compte", "Compte à rebours", Timer, "from-[#E1306C] to-[#FE7223]"],
                ["lien", "Lien", Link2, "from-[#16A34A] to-[#0EA5E9]"],
              ] as const).map(([type, nom, Icone, degrade]) => (
                <button key={type} type="button" onClick={() => ouvrirFormulaire(type)}
                  className={`rounded-2xl bg-gradient-to-br ${degrade} px-3 py-3 text-sm font-bold flex items-center justify-center gap-2`}>
                  <Icone size={18} aria-hidden /> {nom}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-white/60 mb-2">Autocollants</p>
            <div className="grid grid-cols-7 gap-1">
              {AUTOCOLLANTS.map((e) => (
                <button key={e} type="button" className="text-3xl leading-none aspect-square rounded-xl hover:bg-white/10"
                  onClick={() => { setMode(null); ajouter({ id: nouvelId(), type: "emoji", emoji: e, x: 0.5 + ((calques.length % 3) - 1) * 0.22, y: hauteurNouvelle(calques.length), taille: 1 }); }}>{e}</button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Question, sondage, compte à rebours, lien : saisie */}
      {form ? (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setForm(null)}>
          <form className={`w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white text-gray-900 p-4 space-y-3 ${bas}`} onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); validerFormulaire(); }}>
            <h3 className="font-semibold">{form.type === "question" ? "Question" : form.type === "sondage" ? "Sondage" : form.type === "compte" ? "Compte à rebours" : "Lien"}</h3>
            {form.type === "question" ? (
              <>
                <input autoFocus value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} maxLength={120} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Votre question" />
                <p className="text-xs text-gray-500">Les personnes qui voient la story vous répondent ; vous lisez les réponses en touchant « Vues et réponses » sur votre story.</p>
              </>
            ) : form.type === "sondage" ? (
              <>
                <input autoFocus value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} maxLength={120} placeholder="Posez une question… (ex. Jupe ou robe ?)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Question du sondage" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} maxLength={40} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Réponse 1" />
                  <input value={form.b} onChange={(e) => setForm({ ...form, b: e.target.value })} maxLength={40} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Réponse 2" />
                </div>
              </>
            ) : form.type === "compte" ? (
              <>
                <input autoFocus value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} maxLength={60} placeholder="Titre (ex. Prochain cours)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Titre du compte à rebours" />
                <input type="datetime-local" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Date et heure de fin" />
              </>
            ) : (
              <>
                <input autoFocus value={form.texte} onChange={(e) => setForm({ ...form, texte: e.target.value })} maxLength={40} placeholder="Texte du bouton (ex. Voir la formation)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Texte du lien" />
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={300} placeholder={equipe ? "/formation/niveau-1 ou https://…" : "/communaute"} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Adresse du lien" inputMode="url" />
                <p className="text-xs text-gray-500">{equipe ? "Une page du site (commence par /) ou une adresse https://." : "Une page du site Arazzo, qui commence par / (ex. /communaute)."}</p>
              </>
            )}
            {erreurForm ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreurForm}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold">Annuler</button>
              <button type="submit" className="flex-1 rounded-xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white px-4 py-2 text-sm font-semibold">{form.id ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
