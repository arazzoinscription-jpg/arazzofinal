"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";
import { DUREE_PHOTO_MS, ilYa, type StoryVue } from "@/lib/stories/regles";
import { REACTIONS } from "@/lib/stories/calques";
import {
  commentairesStory, commenterStory, etatStories, interagirStory, statsStory, supprimerCommentaireStory, supprimerStory, voirStory,
  type CommentaireStory, type EtatStoryVue, type StatsStory,
} from "@/app/actions/stories";
import { FondStory, RenduCalques, STYLE_CADRE, ZONE_CADRE, type Interactions } from "./rendu-calques";
import { signalerPleinEcran } from "./editeur-story";
import { noterVues } from "./vues-locales";

export interface GroupeStories { userId: string; nom: string; avatar: string | null; stories: StoryVue[] }

/** Une question ou un sondage laisse le temps de lire et de répondre. */
const BONUS_INTERACTIF_MS = 4000;

/** Pour l'autrice : qui a vu, les réponses à sa question, les sondages, les réactions. */
function PanneauActivite({ story, onFermer }: { story: StoryVue; onFermer: () => void }) {
  const [stats, setStats] = useState<StatsStory | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    statsStory(story.id).then((r) => { if (!actif) return; if (r.ok) setStats(r.stats); else setErreur(r.erreur); });
    return () => { actif = false; };
  }, [story.id]);
  const sondages = story.calques.filter((c) => c.type === "sondage");
  const heure = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" });
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/50 flex items-end" onClick={onFermer}>
      <div className="w-full max-h-[72%] overflow-y-auto rounded-t-3xl bg-white text-gray-900 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden />
        {erreur ? <p className="text-sm text-gray-600">{erreur}</p> : !stats ? (
          <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Chargement…</p>
        ) : (
          <div className="space-y-5">
            {sondages.map((c) => {
              const r = stats.sondages[c.id];
              return (
                <section key={c.id}>
                  <h3 className="text-sm font-semibold mb-2">📊 {c.question} <span className="text-gray-400 font-normal">· {r?.total ?? 0} vote{(r?.total ?? 0) > 1 ? "s" : ""}</span></h3>
                  {c.choix.map((ch, k) => (
                    <div key={k} className="relative overflow-hidden rounded-xl border border-gray-200 px-3 py-2 mb-1.5 text-sm">
                      <span className="absolute inset-y-0 start-0 bg-[#5B16F9]/15" style={{ width: `${r?.pct[k] ?? 0}%` }} aria-hidden />
                      <span className="relative flex justify-between"><span>{ch}</span><span className="font-semibold">{r?.nombres[k] ?? 0} · {r?.pct[k] ?? 0} %</span></span>
                    </div>
                  ))}
                </section>
              );
            })}
            {stats.reponses.length || story.calques.some((c) => c.type === "question") ? (
              <section>
                <h3 className="text-sm font-semibold mb-2">💬 Réponses ({stats.reponses.length})</h3>
                {stats.reponses.length ? (
                  <ul className="space-y-2">
                    {stats.reponses.map((r, k) => (
                      <li key={k} className="rounded-2xl bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">{r.nom} · {heure(r.quand)}</div>
                        <p className="text-sm whitespace-pre-wrap break-words">{r.texte}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Pas encore de réponse.</p>}
              </section>
            ) : null}
            {stats.reactions.length ? (
              <section>
                <h3 className="text-sm font-semibold mb-2">Réactions ({stats.reactions.length})</h3>
                <ul className="flex flex-wrap gap-2">
                  {stats.reactions.map((r, k) => <li key={k} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{r.emoji} {r.nom}</li>)}
                </ul>
              </section>
            ) : null}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Eye size={16} aria-hidden /> Vue par {stats.vues.length} personne{stats.vues.length > 1 ? "s" : ""}</h3>
              {stats.vues.length ? (
                <ul className="divide-y divide-gray-100">
                  {stats.vues.map((v, k) => <li key={k} className="py-1.5 text-sm flex justify-between"><span>{v.nom}</span><span className="text-gray-400 text-xs">{heure(v.quand)}</span></li>)}
                </ul>
              ) : <p className="text-sm text-gray-500">Personne pour l&apos;instant.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** Les commentaires d'une story : la liste, et un champ pour commenter (toute personne connectée). */
function PanneauCommentaires({ story, onFermer, onNombre }: { story: StoryVue; onFermer: () => void; onNombre: (n: number) => void }) {
  const [liste, setListe] = useState<CommentaireStory[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let actif = true;
    commentairesStory(story.id).then((r) => {
      if (!actif) return;
      if (r.ok) { setListe(r.commentaires); onNombre(r.commentaires.length); } else setErreur(r.erreur);
    }).catch(() => { if (actif) setErreur("Commentaires indisponibles."); });
    return () => { actif = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [liste?.length]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || !texte.trim()) return;
    setEnvoi(true); setErreur(null);
    const r = await commenterStory({ storyId: story.id, texte });
    setEnvoi(false);
    if (!r.ok) { setErreur(r.erreur); return; }
    setTexte("");
    setListe((l) => { const n = [...(l ?? []), r.commentaire]; onNombre(n.length); return n; });
  }
  async function retirer(id: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const r = await supprimerCommentaireStory(id);
    if (!r.ok) { setErreur(r.erreur); return; }
    setListe((l) => { const n = (l ?? []).filter((c) => c.id !== id); onNombre(n.length); return n; });
  }

  return (
    <div className="absolute inset-0 z-30 bg-black/50 flex items-end" onClick={onFermer}>
      <div className="w-full max-h-[78%] flex flex-col rounded-t-3xl bg-white text-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><MessageCircle size={16} aria-hidden /> Commentaires{liste ? ` (${liste.length})` : ""}</h3>
          <button type="button" onClick={onFermer} aria-label="Fermer les commentaires" className="ms-auto p-1.5 rounded-full hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-[80px] overflow-y-auto px-4 py-3 space-y-3">
          {!liste && !erreur ? <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Chargement…</p> : null}
          {liste && !liste.length ? <p className="text-sm text-gray-500 text-center py-4">Pas encore de commentaire. Soyez la première ✨</p> : null}
          {(liste ?? []).map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-[#5B16F9]/15 text-[#5B16F9] grid place-items-center text-xs font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : c.nom.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500"><b className="text-gray-800">{c.nom}</b> · {ilYa(c.createdAt, new Date())}</div>
                <p className="text-sm whitespace-pre-wrap break-words">{c.texte}</p>
              </div>
              {c.peutSupprimer ? (
                <button type="button" onClick={() => retirer(c.id)} aria-label="Supprimer ce commentaire" className="self-start p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
              ) : null}
            </div>
          ))}
          <div ref={fin} />
        </div>
        {erreur ? <p className="px-4 pb-1 text-sm text-red-600">{erreur}</p> : null}
        <form onSubmit={envoyer} className="flex gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-gray-100">
          <input value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={500} placeholder="Ajouter un commentaire…" aria-label="Votre commentaire"
            className="flex-1 min-w-0 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5B16F9]/40" />
          <button type="submit" disabled={envoi || !texte.trim()} aria-label="Envoyer le commentaire"
            className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-[#5B16F9] text-white disabled:opacity-40">
            {envoi ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Send size={17} aria-hidden />}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Visionneuse plein écran : les stories d'une personne puis de la suivante. Photo et texte : 6 s ; vidéo : sa durée.
 * Toucher à droite = suivante, à gauche = précédente, glisser vers le bas ou ✕ = fermer.
 * Les autres répondent aux questions, votent aux sondages et réagissent ; l'autrice voit qui a vu et les réponses.
 * Tout le monde commente (💬). Une story de l'historique (plus de 24 h) se revoit et se commente, sans voter ni réagir.
 */
export function VisionneuseStories({ groupes, depart, departStory = 0, meId, moderation = false, bibliotheque, onFermer }: {
  groupes: GroupeStories[];
  depart: number;
  /** La story par laquelle commencer dans le 1er groupe ouvert (historique du profil). */
  departStory?: number;
  meId: string | null;
  /** Administration : peut supprimer n'importe quelle story et voir son activité. */
  moderation?: boolean;
  /** Bibliothèque Bunny (lecteur vidéo intégré). */
  bibliotheque: string;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [g, setG] = useState(depart);
  const [i, setI] = useState(departStory);
  const [avance, setAvance] = useState(0);
  const [pauseToucher, setPauseToucher] = useState(false);
  const [pauseSaisie, setPauseSaisie] = useState(false);
  const [activite, setActivite] = useState(false);
  const [commentaires, setCommentaires] = useState(false);
  const [nbCom, setNbCom] = useState<Record<string, number>>({});
  const [etat, setEtat] = useState<Record<string, EtatStoryVue>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [envol, setEnvol] = useState<{ emoji: string; cle: number } | null>(null);
  const debut = useRef<{ x: number; y: number } | null>(null);
  const vues = useRef(new Set<string>());
  const groupe = groupes[g];
  const story = groupe?.stories[i];
  const interactive = Boolean(story?.calques.some((c) => c.type === "question" || c.type === "sondage"));
  const duree = story ? (story.kind === "video" ? Math.max(3, story.duree ?? 15) * 1000 : DUREE_PHOTO_MS + (interactive ? BONUS_INTERACTIF_MS : 0)) : DUREE_PHOTO_MS;
  const pause = pauseToucher || pauseSaisie || activite || commentaires;
  const autrice = Boolean(story && meId === story.userId);

  const suivante = useCallback(() => {
    if (!groupe) return;
    setPauseSaisie(false); setActivite(false); setCommentaires(false);
    if (i < groupe.stories.length - 1) { setI(i + 1); setAvance(0); return; }
    if (g < groupes.length - 1) { setG(g + 1); setI(0); setAvance(0); return; }
    onFermer();
  }, [g, i, groupe, groupes.length, onFermer]);

  const precedente = useCallback(() => {
    setPauseSaisie(false); setActivite(false); setCommentaires(false);
    if (i > 0) { setI(i - 1); setAvance(0); return; }
    if (g > 0) { setG(g - 1); setI(Math.max(0, groupes[g - 1].stories.length - 1)); setAvance(0); }
  }, [g, i, groupes]);

  // Avancement automatique (barres en haut).
  useEffect(() => {
    if (!story || pause) return;
    const pas = 100;
    const t = window.setInterval(() => setAvance((a) => a + pas), pas);
    return () => window.clearInterval(t);
  }, [story, pause]);
  useEffect(() => { if (avance >= duree) suivante(); }, [avance, duree, suivante]);

  // Story affichée = vue (sur cet appareil, et côté serveur pour la liste « Vue par… » de l'autrice).
  useEffect(() => {
    if (!story) return;
    noterVues([story.id]);
    if (meId && story.userId !== meId && !vues.current.has(story.id)) {
      vues.current.add(story.id);
      voirStory(story.id).catch(() => {});
    }
  }, [story, meId]);

  // Mes votes et réactions déjà donnés + résultats des sondages.
  useEffect(() => {
    if (!meId) return;
    const ids = groupes.flatMap((x) => x.stories.filter((s) => s.calques.length || s.userId !== meId).map((s) => s.id)).slice(0, 100);
    if (ids.length) etatStories(ids).then(setEtat).catch(() => {});
  }, [groupes, meId]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.key === "Escape") onFermer();
      if (e.key === "ArrowRight") suivante();
      if (e.key === "ArrowLeft") precedente();
    };
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", touche);
    return () => { window.removeEventListener("keydown", touche); document.body.style.overflow = ancien; };
  }, [onFermer, suivante, precedente]);
  useEffect(() => { signalerPleinEcran(true); return () => signalerPleinEcran(false); }, []);
  useEffect(() => { if (!info) return; const t = window.setTimeout(() => setInfo(null), 3000); return () => window.clearTimeout(t); }, [info]);

  if (!groupe || !story) return null;
  const peutSupprimer = meId === story.userId || moderation;
  const nombreCommentaires = nbCom[story.id] ?? story.nbCommentaires ?? 0;
  const etatStory = etat[story.id];

  async function supprimer() {
    if (!story || !confirm("Supprimer cette story ?")) return;
    const r = await supprimerStory(story.id);
    if (r.ok) { router.refresh(); onFermer(); } else alert(r.erreur);
  }

  async function rafraichirEtat(id: string) {
    const e = await etatStories([id]).catch(() => null);
    if (e) setEtat((avant) => ({ ...avant, [id]: e[id] ?? { mesVotes: {}, maReaction: null, sondages: {} } }));
  }

  // Story de l'historique : plus de votes ni de réponses (on la revoit telle quelle).
  const inter: Interactions | undefined = meId && !story.expiree ? {
    autrice,
    mesVotes: etatStory?.mesVotes ?? {},
    sondages: etatStory?.sondages ?? {},
    onPause: setPauseSaisie,
    onVoter: async (calqueId, choix) => {
      const id = story.id;
      setEtat((avant) => ({ ...avant, [id]: { mesVotes: { ...(avant[id]?.mesVotes ?? {}), [calqueId]: choix }, maReaction: avant[id]?.maReaction ?? null, sondages: avant[id]?.sondages ?? {} } }));
      const r = await interagirStory({ storyId: id, calqueId, kind: "vote", valeur: choix });
      if (!r.ok) setInfo(r.erreur);
      await rafraichirEtat(id);
    },
    onRepondre: async (calqueId, texte) => {
      const r = await interagirStory({ storyId: story.id, calqueId, kind: "reponse", valeur: texte });
      setInfo(r.ok ? "Réponse envoyée ✓" : r.erreur);
      return r.ok;
    },
  } : undefined;

  async function reagir(emoji: string) {
    if (!story) return;
    const id = story.id;
    setEnvol({ emoji, cle: Date.now() });
    setEtat((avant) => ({ ...avant, [id]: { mesVotes: avant[id]?.mesVotes ?? {}, sondages: avant[id]?.sondages ?? {}, maReaction: emoji } }));
    const r = await interagirStory({ storyId: id, kind: "reaction", valeur: emoji });
    if (!r.ok) setInfo(r.erreur);
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Story de ${groupe.nom}`} className="fixed inset-0 z-[85] bg-black flex flex-col"
      onTouchStart={(e) => { debut.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setPauseToucher(true); }}
      onTouchEnd={(e) => {
        setPauseToucher(false);
        const d = debut.current; debut.current = null;
        if (!d || pauseSaisie || activite || commentaires) return;
        const dy = e.changedTouches[0].clientY - d.y;
        if (dy > 120) onFermer();
      }}>
      {/* Barres d'avancement */}
      <div className="flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]">
        {groupe.stories.map((s, k) => (
          <span key={s.id} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
            <span className="block h-full bg-white" style={{ width: `${k < i ? 100 : k === i ? Math.min(100, (avance / duree) * 100) : 0}%` }} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-white">
        <span className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center font-bold text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {groupe.avatar ? <img src={groupe.avatar} alt="" className="w-full h-full object-cover" /> : groupe.nom.charAt(0).toUpperCase()}
        </span>
        <span className="font-semibold text-sm truncate">{groupe.nom}</span>
        {story.equipe ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold shrink-0">Équipe Arazzo</span> : null}
        <span className="text-xs text-white/60 shrink-0">{ilYa(story.createdAt, new Date())}</span>
        {story.enAttente ? <span className="rounded-full bg-amber-400/25 text-amber-100 px-2 py-0.5 text-[10px] font-semibold shrink-0">⏳ en attente</span> : null}
        {peutSupprimer ? (
          <button type="button" onClick={supprimer} aria-label="Supprimer cette story" className="ms-auto p-2 rounded-full hover:bg-white/10"><Trash2 size={18} /></button>
        ) : <span className="ms-auto" />}
        <button type="button" onClick={onFermer} aria-label="Fermer" className="p-2 rounded-full hover:bg-white/10"><X size={22} /></button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center" style={ZONE_CADRE}>
        <div className="relative overflow-hidden rounded-xl bg-[#111]" style={STYLE_CADRE}>
          {story.kind === "video" ? (
            story.bunnyVideoId && bibliotheque ? (
              <iframe key={story.id} src={`https://iframe.mediadelivery.net/embed/${bibliotheque}/${story.bunnyVideoId}?autoplay=true&loop=false&preload=true&responsive=true${story.debut ? `&t=${story.debut}` : ""}`}
                title="Story vidéo" allow="autoplay; encrypted-media" className="absolute inset-0 w-full h-full" style={{ border: 0 }} />
            ) : <p className="absolute inset-0 grid place-items-center text-white/70 text-sm">Story indisponible.</p>
          ) : story.kind === "texte" || story.mediaUrl ? (
            <FondStory key={story.id} kind={story.kind} url={story.mediaUrl} fond={story.fond} alt={story.legende ?? `Story de ${groupe.nom}`} />
          ) : <p className="absolute inset-0 grid place-items-center text-white/70 text-sm">Story indisponible.</p>}
          {/* Zones de toucher : gauche = précédente, droite = suivante (le milieu reste au lecteur vidéo) */}
          <button type="button" aria-label="Story précédente" onClick={precedente} className="absolute inset-y-0 start-0 w-1/3 z-[5]" />
          <button type="button" aria-label="Story suivante" onClick={suivante} className={`absolute inset-y-0 end-0 z-[5] ${story.kind === "video" ? "w-1/3" : "w-2/3"}`} />
          <RenduCalques key={`c-${story.id}`} calques={story.calques} inter={inter} />
          {envol ? <span key={envol.cle} className="absolute z-20 start-1/2 bottom-[10%] -translate-x-1/2 text-[18cqw] pointer-events-none animate-[story-envol_1.1s_ease-out_forwards]" onAnimationEnd={() => setEnvol(null)} aria-hidden>{envol.emoji}</span> : null}
          {info ? <p role="status" className="absolute z-20 inset-x-[8%] bottom-[4%] rounded-full bg-black/75 text-white text-center text-sm px-3 py-2">{info}</p> : null}
          {activite ? <PanneauActivite story={story} onFermer={() => setActivite(false)} /> : null}
          {commentaires ? <PanneauCommentaires story={story} onFermer={() => setCommentaires(false)} onNombre={(n) => setNbCom((m) => ({ ...m, [story.id]: n }))} /> : null}
        </div>
      </div>

      <div className="px-4 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] text-white space-y-2" onTouchStart={(e) => e.stopPropagation()}>
        {story.legende ? <p className="text-sm text-center">{story.legende}</p> : null}
        {meId && (autrice || moderation) ? (
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => { setCommentaires(false); setActivite((a) => !a); }} className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-semibold">
              <Eye size={16} aria-hidden /> Vues et réponses
            </button>
            <button type="button" onClick={() => { setActivite(false); setCommentaires(true); }} className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-semibold">
              <MessageCircle size={16} aria-hidden /> {nombreCommentaires ? `${nombreCommentaires} commentaire${nombreCommentaires > 1 ? "s" : ""}` : "Commentaires"}
            </button>
          </div>
        ) : meId ? (
          <div className="flex justify-center items-center gap-1.5" aria-label="Réagir à la story">
            {!story.expiree ? REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => reagir(e)} aria-label={`Réagir ${e}`} aria-pressed={etatStory?.maReaction === e}
                className={`w-10 h-10 rounded-full text-[22px] leading-none grid place-items-center transition ${etatStory?.maReaction === e ? "bg-white/30 scale-110" : "bg-white/10 hover:bg-white/20"}`}>{e}</button>
            )) : null}
            <button type="button" onClick={() => setCommentaires(true)} aria-label="Commenter la story"
              className="h-10 rounded-full bg-white/15 hover:bg-white/25 px-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              <MessageCircle size={18} aria-hidden />{nombreCommentaires ? <span>{nombreCommentaires}</span> : (story.expiree ? <span>Commenter</span> : null)}
            </button>
          </div>
        ) : null}
      </div>
      <style>{"@keyframes story-envol{0%{transform:translate(-50%,0) scale(.6);opacity:0}25%{opacity:1}100%{transform:translate(-50%,-260%) scale(1.4);opacity:0}}"}</style>
    </div>,
    document.body,
  );
}
