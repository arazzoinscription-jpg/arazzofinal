"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Volume2, VolumeX, ArrowRight, ArrowLeft, LayoutGrid, Scissors, X, Send, Facebook, Loader2, Check, Share2, Trash2, Link2, MessageCircleMore, Music } from "lucide-react";
import { toggleLike, addComment, deletePost } from "@/app/actions/feed";
import { getPostComments } from "@/app/actions/community";
import { addFacebookVideo } from "@/app/actions/community-upload";
import { toast } from "@/components/ui/toast";
import { sourceLabel, isFacebookVideoUrl, facebookEmbedSrc, type CommunityItem } from "@/lib/community-types";
import { cdnImage } from "@/lib/storage-cdn";
import { pickTrackForKey } from "@/lib/feed-music";
import { CommunityTabs } from "./community-tabs";
import { FeedWelcome } from "@/components/community/feed-welcome";
import type { Promo } from "@/app/free/[slug]/promo-banner";

/** Format (largeur / hauteur) jusqu'auquel un média remplit l'écran : 9:16 (0,56) oui ; 3:4 (0,75) ou carré non. */
const RATIO_REMPLIR = 0.66;

/** Écran plus haut que large (téléphone) : là seulement on remplit l'écran. */
function useEcranVertical(): boolean {
  const [vertical, setVertical] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(max-aspect-ratio: 4/5)");
    const maj = () => setVertical(m.matches);
    maj();
    m.addEventListener("change", maj);
    return () => m.removeEventListener("change", maj);
  }, []);
  return vertical;
}

interface Comment {
  id: string; content: string; created_at: string; author_id: string;
  author: { id: string; nom: string; avatar_url: string | null; role: string };
}

export function FeedClient({ items, meId, bunnyLibraryId, canModerate = false, isGuest = false, welcome = null, stories = null }: { items: CommunityItem[]; meId: string; bunnyLibraryId: string; canModerate?: boolean; isGuest?: boolean; welcome?: { promo: Promo | null; page: Record<string, any> | null } | null; stories?: ReactNode }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [fbOpen, setFbOpen] = useState(false);
  const [gate, setGate] = useState<null | "soft">(null);
  // Slides ayant déjà déclenché l'invitation : évite qu'elle se rouvre en boucle
  // (l'IntersectionObserver rappelle onActive plusieurs fois pour la même slide,
  //  ce qui rouvrait le popup juste après « Plus tard »).
  const promptedRef = useRef<Set<number>>(new Set());
  // L'accueil des nouvelles visiteuses (test de niveau + code promo) : tant qu'il est ouvert, l'invitation
  // à se connecter ne s'ouvre pas par-dessus (jamais deux fenêtres à la fois).
  const welcomeOuvertRef = useRef(false);
  const surAccueilOuvert = useCallback((ouvert: boolean) => {
    welcomeOuvertRef.current = ouvert;
    if (ouvert) setGate(null);
  }, []);

  // Feed 100 % PUBLIC : les visiteurs voient tout, sans limite ni blocage.
  // Une invitation à se connecter (toujours refermable) apparaît de temps en temps.
  const shown = items;
  const activeIndex = shown.findIndex((x) => x.id === activeId);

  // ── Son automatique ──────────────────────────────────────────────────────
  // Les navigateurs INTERDISENT la lecture automatique AVEC son tant qu'il n'y a
  // pas eu d'interaction utilisateur (règle anti-pub, incontournable). On démarre
  // donc en muet (pour que la vidéo se lance), puis on active le son au TOUT
  // PREMIER geste (toucher / scroll / clic) — ce qui arrive dès qu'on ouvre le
  // feed. Résultat : le son s'active « tout seul » dès qu'on commence à regarder.
  // UNE seule fois : si on coupe le son ensuite avec le bouton, il reste coupé. Et si ce 1ᵉʳ geste est un appui
  // sur le bouton son, c'est le bouton qui décide (sinon il annulerait son propre effet).
  useEffect(() => {
    const evs: (keyof WindowEventMap)[] = ["pointerdown", "mousedown", "click", "touchstart", "keydown", "wheel", "scroll"];
    const premierGeste = (e: Event) => {
      evs.forEach((ev) => window.removeEventListener(ev, premierGeste));
      if (e.target instanceof Element && e.target.closest("[data-feed-son]")) return;
      setMuted(false);
    };
    evs.forEach((ev) => window.addEventListener(ev, premierGeste, { passive: true }));
    return () => evs.forEach((ev) => window.removeEventListener(ev, premierGeste));
  }, []);

  // Bulle « Touchez pour couper le son » à côté du bouton son : seulement à la 1ʳᵉ visite, quelques secondes.
  const [astuceSon, setAstuceSon] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("arazzo_feed_astuce_son")) return;
      localStorage.setItem("arazzo_feed_astuce_son", "1");
    } catch { /* stockage indisponible : on montre quand même la bulle */ }
    setAstuceSon(true);
    const t = setTimeout(() => setAstuceSon(false), 7000);
    return () => clearTimeout(t);
  }, []);
  const basculerSon = useCallback(() => { setMuted((m) => !m); setAstuceSon(false); }, []);

  // Une story (lecture ou création) occupe l'écran : les vidéos du feed se taisent le temps qu'elle reste ouverte.
  const [storyPleinEcran, setStoryPleinEcran] = useState(false);
  useEffect(() => {
    const f = (e: Event) => setStoryPleinEcran(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("arazzo:story-plein-ecran", f);
    return () => window.removeEventListener("arazzo:story-plein-ecran", f);
  }, []);

  // Barre de stories : dépliée en haut du feed, repliée dès qu'on fait défiler (bouton « Stories » pour la rouvrir).
  const enHaut = activeIndex <= 0;
  const [storiesRouvertes, setStoriesRouvertes] = useState(false);
  useEffect(() => { setStoriesRouvertes(false); }, [activeId]);
  const storiesVisibles = Boolean(stories) && (enHaut || storiesRouvertes);

  // Hauteur réelle de la barre du haut : l'alerte « Bravo ! » se place juste en dessous.
  const barreHaut = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barreHaut.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--feed-haut", `${Math.round(el.getBoundingClientRect().height)}px`));
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--feed-haut"); };
  }, []);

  // ── Préconnexion aux hôtes média (accélère le 1ᵉʳ chargement) ─────────────
  // Ouvre à l'avance la connexion (DNS + TLS) vers Bunny (vidéos) et le CDN des
  // images, pour supprimer la latence d'établissement au moment de lire.
  const preconnectHosts = useMemo(() => {
    const s = new Set<string>(["https://iframe.mediadelivery.net"]);
    for (const it of items.slice(0, 6)) {
      for (const u of [it.thumbnail, it.mediaUrl, it.videoHls]) {
        if (u) { try { s.add(new URL(u).origin); } catch { /* URL relative/invalide */ } }
      }
    }
    return [...s];
  }, [items]);

  function activate(id: string) {
    setActiveId(id);
    if (!isGuest) return;
    const idx = shown.findIndex((x) => x.id === id);
    // 4ᵉ, 9ᵉ, 14ᵉ… slide → invitation douce, UNE seule fois par slide.
    if (idx >= 3 && (idx - 3) % 5 === 0 && !promptedRef.current.has(idx) && !welcomeOuvertRef.current) {
      promptedRef.current.add(idx);
      setGate("soft");
    }
  }

  // Barre du haut : Retour · logo→site · dashboard · Facebook + onglets bascule (le bouton son est sur la vidéo).
  const topBar = (
    <div ref={barreHaut} className="fixed top-0 inset-x-0 z-30 pt-[max(10px,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/55 via-black/20 to-transparent [text-shadow:0_1px_3px_rgba(0,0,0,.55)]">
      <div className="flex items-center gap-2 px-3">
        <button onClick={() => router.back()} aria-label="Retour"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><ArrowLeft size={18} /></button>
        <Link href="/" className="font-playfair text-white font-bold text-base drop-shadow shrink-0">Arazzo</Link>
        <div className="flex-1" />
        {stories && !storiesVisibles ? (
          <button type="button" onClick={() => setStoriesRouvertes(true)} aria-label="Afficher les stories"
            className="h-9 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 text-white text-xs font-semibold shrink-0">
            <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#FE7223] via-[#e1306c] to-[#5B16F9] p-[2px]" aria-hidden><span className="block w-full h-full rounded-full bg-[#0b0818]" /></span>
            Stories
          </button>
        ) : null}
        <Link href={isGuest ? "/register" : "/dashboard"} aria-label={isGuest ? "S'inscrire" : "Tableau de bord"}
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><LayoutGrid size={17} /></Link>
        <button onClick={() => (isGuest ? setGate("soft") : setFbOpen(true))} aria-label="Partager une vidéo Facebook"
          className="w-9 h-9 grid place-items-center rounded-full bg-[#1877F2] text-white shrink-0"><Facebook size={17} /></button>
      </div>
      {/* Menu UNIQUE de la communauté (Pour toi · Actualité · Groups · Offre) */}
      <div className="mt-1.5"><CommunityTabs /></div>
      {stories ? (
        <div className={`grid transition-[grid-template-rows] duration-300 ${storiesVisibles ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} aria-hidden={!storiesVisibles}>
          <div className={`min-h-0 overflow-hidden ${storiesVisibles ? "" : "invisible"}`}><div className="pt-2">{stories}</div></div>
        </div>
      ) : null}
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0b0818] text-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Scissors className="text-orange-400" size={44} />
        <h1 className="font-playfair text-2xl font-bold">La communauté est encore vide</h1>
        <p className="text-white/60 font-dm max-w-sm">Sois la première à publier : partage un de tes travaux pratiques depuis tes cours, ou reviens bientôt découvrir les créations des autres.</p>
        <Link href="/dashboard" className="mt-2 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold">Retour au tableau de bord</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: "none" }}>
      {/* Préconnexion aux hôtes média : supprime la latence DNS/TLS au 1ᵉʳ chargement. */}
      {preconnectHosts.map((h) => (
        <link key={h} rel="preconnect" href={h} crossOrigin="anonymous" />
      ))}
      {topBar}

      {shown.length === 0 ? (
        <div className="h-[100dvh] flex items-center justify-center text-white/60 px-8 text-center font-dm">
          Aucune vidéo dans cette catégorie pour l'instant.
        </div>
      ) : shown.map((it, idx) => (
        <Slide
          key={it.id}
          item={it}
          active={activeId === it.id}
          // Précharge la slide suivante (vidéo + image) pour un défilement instantané.
          preload={idx === activeIndex + 1}
          // Seules la slide active et ses voisines montent un lecteur vidéo : les autres n'affichent que leur image
          // (sinon le navigateur charge TOUTES les vidéos du feed en même temps — très lourd).
          near={activeIndex < 0 ? idx < 2 : Math.abs(idx - activeIndex) <= 1}
          muted={muted || storyPleinEcran}
          onToggleMute={basculerSon}
          astuceSon={astuceSon && activeId === it.id}
          bunnyLibraryId={bunnyLibraryId}
          meId={meId}
          canModerate={canModerate}
          isGuest={isGuest}
          onGuest={() => setGate("soft")}
          onActive={() => activate(it.id)}
          onOpenComments={() => (isGuest ? setGate("soft") : setCommentPost(it.postId))}
        />
      ))}

      {commentPost && (
        <Portal><CommentSheet postId={commentPost} onClose={() => setCommentPost(null)} /></Portal>
      )}

      {fbOpen && <Portal><FacebookAddSheet onClose={() => setFbOpen(false)} /></Portal>}

      {gate && <Portal><GuestGate onClose={() => setGate(null)} /></Portal>}

      {/* Accueil des nouvelles visiteuses : le test de niveau après 2-3 s de défilement, un code promo en cadeau. */}
      {isGuest && (
        <FeedWelcome
          page={welcome?.page ?? null}
          promo={welcome?.promo ?? null}
          blocked={gate !== null || commentPost !== null || fbOpen}
          onOpenChange={surAccueilOuvert}
        />
      )}
    </div>
  );
}

/** Rend les popups au niveau <body> pour qu'ils passent AU-DESSUS du feed, du « + » et du menu. */
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** Invitation à se connecter pour les visiteurs : douce et TOUJOURS refermable (le feed n'est jamais bloqué). */
function GuestGate({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-DEFAULT text-white mb-4"><Scissors size={26} /></span>
        <h3 className="font-playfair text-2xl font-bold text-violet-950 mb-2">
          Rejoins la communauté Arazzo
        </h3>
        <p className="text-gray-600 font-dm text-sm mb-5">
          Inscris-toi gratuitement pour aimer, commenter, publier tes travaux et profiter des cours de modélisme.
        </p>
        <div className="flex flex-col gap-2.5">
          <Link href="/register" className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors">
            S'inscrire gratuitement <ArrowRight size={18} />
          </Link>
          <Link href="/login?redirect=/communaute" className="w-full inline-flex items-center justify-center gap-2 border-2 border-violet-200 text-violet-700 py-2.5 rounded-2xl font-semibold hover:bg-violet-50 transition-colors">
            J'ai déjà un compte
          </Link>
          <button onClick={onClose} className="text-sm text-gray-400 font-dm mt-1 hover:text-gray-600">Plus tard</button>
        </div>
      </div>
    </div>
  );
}

/** Partager une vidéo Facebook par lien (aucun téléchargement / réupload). */
function FacebookAddSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const valid = isFacebookVideoUrl(url.trim());

  function submit() {
    setError(null);
    if (!valid) { setError("Collez le lien d'une vidéo Facebook (facebook.com ou fb.watch)."); return; }
    startTransition(async () => {
      const res = await addFacebookVideo({ url: url.trim(), caption: caption.trim() || undefined });
      if (res.ok) { setDone(true); router.refresh(); setTimeout(onClose, 900); }
      else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center gap-2 font-semibold text-gray-900">
            <Facebook size={20} className="text-[#1877F2]" /> Partager une vidéo Facebook
          </span>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-cream-100"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Collez le lien d'une vidéo Facebook <strong>publique</strong> (la vôtre ou d'un autre compte). La vidéo reste hébergée chez Facebook — aucun téléchargement.</p>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm mb-3">{error}</div>}
        {done && <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-sm mb-3 flex items-center gap-2"><Check size={15} /> Vidéo ajoutée au feed !</div>}

        <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la vidéo Facebook</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://www.facebook.com/.../videos/..."
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] mb-1" />
        {url.trim() && !valid && <p className="text-xs text-red-500 mb-2">Ce lien n'est pas une vidéo Facebook.</p>}

        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Légende (optionnel)</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={500} placeholder="Décrivez la vidéo…"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]" />

        <button onClick={submit} disabled={isPending || !valid}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#1877F2] text-white py-3 rounded-xl font-semibold hover:bg-[#1568d8] disabled:opacity-50 transition-colors">
          {isPending ? <Loader2 size={18} className="animate-spin" /> : <Facebook size={18} />} Partager dans le feed
        </button>
      </div>
    </div>
  );
}

function Slide({
  item, active, preload = false, near = true, muted, onToggleMute, astuceSon = false, bunnyLibraryId, meId, canModerate, isGuest, onGuest, onActive, onOpenComments,
}: {
  item: CommunityItem; active: boolean; preload?: boolean; near?: boolean; muted: boolean; onToggleMute: () => void;
  astuceSon?: boolean; bunnyLibraryId: string;
  meId: string; canModerate: boolean; isGuest: boolean; onGuest: () => void;
  onActive: () => void; onOpenComments: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Musique : soit celle choisie explicitement à la publication, soit une piste
  // « aléatoire mais stable » de la bibliothèque (même morceau à chaque chargement).
  const track = item.music ?? pickTrackForKey(item.id);
  const musicUrl = track?.url ?? null;
  const musicTitle = track?.title ?? null;
  const hasMusic = !!musicUrl;
  // La vidéo joue-t-elle VRAIMENT (une image à l'écran) ? Tant que non : image d'attente + roue, et pas de musique
  // (sinon : écran noir avec la musique). Illisible (format non pris en charge, fichier absent) : on le dit.
  const [joue, setJoue] = useState(false);
  const [illisible, setIllisible] = useState(false);
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [, startTransition] = useTransition();

  const isOwner = item.author.id === meId;
  // Lien partageable + attribution « filigrane » Arazzo.
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/communaute` : "https://www.formation-arazzo.store/communaute";
  const shareText = `${item.caption ? item.caption + " — " : ""}🧵 via Arazzo Formation`;

  async function nativeShare() {
    try {
      if (navigator.share) { await navigator.share({ title: "Arazzo Formation", text: shareText, url: shareUrl }); setShareOpen(false); return true; }
    } catch { /* annulé */ }
    return false;
  }
  function openSocial(kind: "whatsapp" | "facebook" | "copy") {
    const enc = encodeURIComponent(`${shareText} ${shareUrl}`);
    if (kind === "whatsapp") window.open(`https://wa.me/?text=${enc}`, "_blank");
    else if (kind === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, "_blank");
    else { navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).then(() => toast("Lien copié 🔗", "success")); }
    setShareOpen(false);
  }
  function del() {
    if (!confirm("Supprimer cette publication du feed ?")) return;
    startTransition(async () => {
      const r = await deletePost(item.postId);
      if (r.ok) { toast("Publication supprimée", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  // Détecte quand la slide est majoritairement visible → devient active.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio > 0.6) onActive(); },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onActive]);

  // Plein écran « comme Instagram » : sur un écran de téléphone (vertical), une vidéo ou photo VERTICALE remplit
  // l'écran (bords légèrement rognés) au lieu de laisser deux bandes noires en haut et en bas.
  // Une vidéo horizontale ou une photo carrée reste entière ; sur ordinateur, rien n'est rogné.
  const ecranVertical = useEcranVertical();
  const [ratio, setRatio] = useState<number | null>(null);
  const remplir = ecranVertical && (ratio === null || ratio <= RATIO_REMPLIR);
  useEffect(() => {
    // Vidéo Bunny : son format vient de sa miniature (même image).
    if (item.mediaUrl || !item.videoHls || !item.thumbnail) return;
    const im = new Image();
    im.onload = () => { if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight); };
    im.src = item.thumbnail;
  }, [item.mediaUrl, item.videoHls, item.thumbnail]);

  // Lecture/pause de la vidéo native selon l'état actif. Le « muet » est posé sur l'élément AVANT play() (React ne le
  // reflète pas toujours à temps) ; si la lecture avec son est refusée, on relance en muet plutôt que rester noir.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.muted = muted || hasMusic;
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    } else { v.pause(); v.currentTime = 0; setJoue(false); }
  }, [active, near, muted, hasMusic]);

  // Musique de fond : en boucle sur la slide active, MAIS seulement quand l'image est là (vidéo qui joue, image, Bunny,
  // Facebook) — jamais sur un écran noir.
  const estVideoNative = item.mediaKind !== "image" && !isFacebookVideoUrl(item.mediaUrl) && !!item.mediaUrl;
  const imagePrete = !estVideoNative || joue;
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (active && imagePrete) { a.play().catch(() => {}); } else { a.pause(); if (!active) a.currentTime = 0; }
  }, [active, imagePrete]);

  // Le son de la musique suit l'état muet global (activé au 1ᵉʳ geste, comme la vidéo).
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.muted = muted;
  }, [muted]);

  function onLike() {
    if (isGuest) { onGuest(); return; }
    setLiked((l) => !l);
    setLikeCount((c) => c + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(item.postId);
      if (res.ok) { setLiked(res.liked ?? false); setLikeCount(res.count ?? 0); }
    });
  }

  const isFacebook = isFacebookVideoUrl(item.mediaUrl);
  const isBunny = !item.mediaUrl && !!item.videoHls;
  const ajustement = remplir ? "object-cover" : "object-contain";
  // Lecteur Bunny (iframe) : on ne peut pas régler son cadrage ; on l'agrandit au format de la vidéo pour couvrir l'écran.
  const styleBunny: React.CSSProperties = remplir && ratio
    ? { border: 0, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: `max(100%, calc(100dvh * ${ratio}))`, height: `max(100%, calc(100vw / ${ratio}))` }
    : { border: 0 };
  const lireRatio = (l: number, h: number) => { if (l > 0 && h > 0) setRatio(l / h); };

  return (
    <section ref={ref} className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black">
      {/* Média */}
      {item.mediaKind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cdnImage(item.mediaUrl ?? item.thumbnail ?? "")}
          alt=""
          // La slide active + la suivante se chargent en priorité ; le reste en différé.
          loading={active || preload ? "eager" : "lazy"}
          decoding="async"
          onLoad={(e) => lireRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
          className={`absolute inset-0 w-full h-full ${ajustement}`}
        />
      ) : isFacebook ? (
        active ? (
          <iframe
            src={facebookEmbedSrc(item.mediaUrl)}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen scrolling="no"
            className="absolute inset-0 w-full h-full" style={{ border: 0 }} loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0818] text-white/70">
            <Facebook size={44} className="text-[#1877F2]" />
            <span className="font-dm text-sm">Vidéo Facebook</span>
          </div>
        )
      ) : isBunny ? (
        // Slide active → lecture. Slide suivante (preload) → iframe monté SANS
        // lecture ni son : Bunny préchauffe la connexion et le 1ᵉʳ segment, donc
        // le défilement suivant démarre quasi instantanément.
        active || preload ? (
          <iframe
            src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${getBunnyId(item.videoHls)}?autoplay=${active ? "true" : "false"}&loop=true&muted=${active ? (muted || hasMusic) : true}&preload=true&responsive=true`}
            allow="autoplay; encrypted-media; picture-in-picture"
            className={remplir && ratio ? "" : "absolute inset-0 w-full h-full"} style={styleBunny} loading="eager"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full ${ajustement}`} />
        )
      ) : !near ? (
        // Loin de l'écran : juste l'image (aucune vidéo chargée).
        item.thumbnail
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={cdnImage(item.thumbnail)} alt="" loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full ${ajustement}`} />
          : <div className="absolute inset-0 bg-[#0b0818]" />
      ) : (
        <>
          <video
            ref={videoRef}
            // Sans miniature, « #t=0.1 » fait afficher la 1ʳᵉ image de la vidéo au lieu d'un écran noir.
            src={item.mediaUrl ? (item.thumbnail ? item.mediaUrl : `${item.mediaUrl}#t=0.1`) : ""}
            poster={item.thumbnail ? cdnImage(item.thumbnail) : undefined}
            muted={muted || hasMusic} loop playsInline
            preload={active ? "auto" : "metadata"}
            onLoadedMetadata={(e) => lireRatio(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
            onPlaying={() => { setJoue(true); setIllisible(false); }}
            onWaiting={() => setJoue(false)}
            onError={() => { setIllisible(true); setJoue(false); }}
            className={`absolute inset-0 w-full h-full ${ajustement}`}
          />
          {active && !joue && !illisible ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="animate-spin text-white/80" size={40} />
            </div>
          ) : null}
          {illisible ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white/80 px-8 text-center pointer-events-none">
              <span className="font-dm text-sm">Cette vidéo ne peut pas être lue sur cet appareil.</span>
            </div>
          ) : null}
        </>
      )}

      {/* Musique de fond (bibliothèque interne) : jouée en boucle sur la slide active. */}
      {hasMusic && (
        <audio ref={audioRef} src={musicUrl!} loop preload={active || preload ? "auto" : "none"} />
      )}

      {/* Dégradé bas pour lisibilité */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Actions latérales */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5 text-white">
        {/* Son (vidéo + musique). Pas sur une photo sans musique (rien à couper) ni sur Facebook (son géré par son lecteur). */}
        {(hasMusic || (item.mediaKind !== "image" && !isFacebook)) && (
          <div className="relative flex flex-col items-center gap-1">
            <button data-feed-son onClick={onToggleMute} aria-label={muted ? "Activer le son" : "Couper le son"}
              className="flex flex-col items-center gap-1">
              <span className="relative w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur">
                {astuceSon && <span className="absolute inset-0 rounded-full bg-orange-500/50 animate-ping" />}
                {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </span>
              <span className="text-xs font-semibold">{muted ? "Muet" : "Son"}</span>
            </button>
            {astuceSon && (
              <span className="absolute right-14 top-3 whitespace-nowrap bg-white text-gray-900 text-xs font-semibold font-dm px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-fade-in">
                {muted ? "Touchez pour activer le son 🔊" : "Touchez pour couper le son 🔇"}
              </span>
            )}
          </div>
        )}
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <span className={`w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur ${liked ? "text-orange-500" : "text-white"}`}>
            <Heart size={26} fill={liked ? "currentColor" : "none"} />
          </span>
          <span className="text-xs font-semibold">{likeCount}</span>
        </button>
        <button onClick={onOpenComments} className="flex flex-col items-center gap-1">
          <span className="w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur">
            <MessageCircle size={26} />
          </span>
          <span className="text-xs font-semibold">{item.commentCount}</span>
        </button>

        {/* Partager */}
        <div className="relative flex flex-col items-center gap-1">
          <button onClick={async () => { if (!(await nativeShare())) setShareOpen((o) => !o); }} className="flex flex-col items-center gap-1">
            <span className="w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur"><Share2 size={24} /></span>
            <span className="text-xs font-semibold">Partager</span>
          </button>
          {shareOpen && (
            <div className="absolute right-14 bottom-0 w-44 bg-white rounded-2xl shadow-2xl overflow-hidden text-gray-800 text-sm">
              <button onClick={() => openSocial("whatsapp")} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream-100 text-start"><MessageCircleMore size={17} className="text-green-600" /> WhatsApp</button>
              <button onClick={() => openSocial("facebook")} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream-100 text-start"><Facebook size={17} className="text-[#1877F2]" /> Facebook</button>
              <button onClick={() => openSocial("copy")} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream-100 text-start"><Link2 size={17} className="text-violet-600" /> Copier le lien</button>
            </div>
          )}
        </div>

        {/* Supprimer (propriétaire ou admin) */}
        {(isOwner || canModerate) && (
          <button onClick={del} className="flex flex-col items-center gap-1">
            <span className="w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur text-red-300"><Trash2 size={23} /></span>
            <span className="text-xs font-semibold">Suppr.</span>
          </button>
        )}
      </div>

      {/* Infos auteur + légende + CTA */}
      <div className="absolute left-4 right-20 bottom-24 z-20 text-white">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wide bg-white/15 backdrop-blur px-2 py-0.5 rounded-full mb-2">
          {sourceLabel(item.sourceType)}
        </span>
        <Link href={`/communaute/u/${item.author.id}`} className="flex items-center gap-2 mb-2">
          <span className="w-9 h-9 rounded-full bg-orange-DEFAULT grid place-items-center overflow-hidden font-bold text-sm">
            {item.author.avatar_url
              ? <img src={item.author.avatar_url} alt="" className="w-full h-full object-cover" />
              : (item.author.nom[0] ?? "?").toUpperCase()}
          </span>
          <span className="font-semibold drop-shadow">{item.author.nom}</span>
        </Link>
        {item.caption && <p className="text-sm text-white/90 font-dm line-clamp-2 drop-shadow mb-2">{item.caption}</p>}
        {hasMusic && (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/85 font-dm mb-3 max-w-full">
            <Music size={13} className="shrink-0 animate-pulse" />
            <span className="truncate">{musicTitle ?? "Musique"}</span>
          </span>
        )}
        {item.cta && (
          <Link href={item.cta.href}
            className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg">
            {item.cta.label} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

/** Extrait le GUID Bunny depuis l'URL HLS `{pullzone}/{guid}/playlist.m3u8`. */
function getBunnyId(hls: string | null): string {
  if (!hls) return "";
  const parts = hls.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

function CommentSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getPostComments(postId).then((res) => {
      if (alive && res.ok) setComments(res.comments as Comment[]);
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [postId]);

  function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    startTransition(async () => {
      const res = await addComment(postId, t);
      if (res.ok && res.comment) setComments((c) => [...c, res.comment as unknown as Comment]);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[70vh] bg-white rounded-t-3xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <span className="font-semibold text-gray-900">{comments.length} commentaire(s)</span>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-cream-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sois la première à commenter ✨</p>
          ) : comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-orange-DEFAULT grid place-items-center overflow-hidden text-white text-xs font-bold shrink-0">
                {c.author.avatar_url ? <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.author.nom[0] ?? "?").toUpperCase()}
              </span>
              <div>
                <p className="text-sm"><span className="font-semibold text-gray-900">{c.author.nom}</span></p>
                <p className="text-sm text-gray-700 font-dm">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 border-t border-cream-200 pb-[max(12px,env(safe-area-inset-bottom))]">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ajoute un commentaire…"
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button onClick={send} disabled={isPending || !text.trim()}
            className="w-10 h-10 grid place-items-center rounded-full bg-orange-DEFAULT text-white disabled:opacity-50"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}
