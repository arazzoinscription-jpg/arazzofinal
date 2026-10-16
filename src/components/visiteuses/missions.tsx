"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Camera, Check, ChevronRight, Copy, Gift, GraduationCap, Loader2, PlayCircle, Sparkles, Target, Trophy, X } from "lucide-react";
import LevelTestPopup from "@/lib/level-test-popup";
import { LandingStyles } from "@/lib/landing-kit";
import type { MissionsVue } from "@/lib/visiteuses/load";
import { MESSAGE_EN_ATTENTE } from "@/lib/visiteuses/regles";
import { missionsDuFeed, participerDefi } from "@/app/actions/visiteuses";
import { toggleFollow } from "@/app/actions/community";
import { tempsRestant } from "@/lib/stories/calques";

const CLE_VU = "arazzo:missions-ouvertes";
const SLUG_TEST = "niveau-couture";
/** Les jetons de couleur du kit des landings, sans son fond plein écran : le popup du test s'y habille. */
const PORTEE_KIT: CSSProperties = { position: "static", inset: "auto", zIndex: "auto", overflow: "visible", background: "none" };

/** Fermer le panneau et ouvrir les stories (l'enseignante d'abord) : la barre de stories écoute cet événement. */
function ouvrirStories() { window.dispatchEvent(new Event("arazzo:ouvrir-stories")); }

function Etape({ fait, titre, detail, action }: { fait: boolean; titre: string; detail: string; action?: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${fait ? "bg-emerald-400/10" : "bg-white/[0.06]"}`}>
      <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${fait ? "bg-emerald-500 text-white" : "border-2 border-white/30"}`} aria-hidden>{fait ? <Check size={14} /> : null}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${fait ? "text-emerald-200" : "text-white"}`}>{titre}{fait ? <span className="sr-only"> (fait)</span> : null}</div>
        <div className="text-xs text-white/60 leading-snug">{detail}</div>
      </div>
      {!fait && action ? <div className="shrink-0 self-center">{action}</div> : null}
    </li>
  );
}

const btn = "rounded-full bg-white text-[#2A0880] px-3 py-1.5 text-xs font-bold whitespace-nowrap disabled:opacity-50";

/** Le panneau des missions (plein écran sur téléphone, fenêtre sur ordinateur). */
function Panneau({ m, email, prenom, onFermer, onMaj }: { m: MissionsVue; email: string | null; prenom: string; onFermer: () => void; onMaj: () => void }) {
  const [test, setTest] = useState(false);
  const [copie, setCopie] = useState(false);
  const [suivre, setSuivre] = useState(false);
  const [defiOuvert, setDefiOuvert] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [legende, setLegende] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const faites = m.etapes.filter((e) => e.fait).length;

  useEffect(() => {
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape" && !test) onFermer(); };
    window.addEventListener("keydown", echap);
    return () => { document.body.style.overflow = ancien; window.removeEventListener("keydown", echap); };
  }, [onFermer, test]);

  async function suivreEnseignante() {
    if (!m.enseignante) return;
    setSuivre(true);
    await toggleFollow(m.enseignante.id).catch(() => null);
    setSuivre(false);
    onMaj();
  }

  async function envoyerDefi(e: React.FormEvent) {
    e.preventDefault();
    if (!m.defi || !photo) return;
    setEnvoi(true); setMessage(null);
    const fd = new FormData();
    fd.append("defiId", m.defi.id);
    fd.append("photo", photo);
    fd.append("legende", legende);
    const r = await participerDefi(fd);
    setEnvoi(false);
    if (!r.ok) { setMessage(r.erreur); return; }
    setMessage(r.enAttente ? MESSAGE_EN_ATTENTE : "Bravo ! Votre réalisation est publiée dans le feed.");
    setDefiOuvert(false); setPhoto(null); setLegende("");
    onMaj();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Vos missions" className="fixed inset-0 z-[86] bg-black/60 flex items-end sm:items-center justify-center" onClick={onFermer}>
      <div className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#140f2b] text-white px-4 pt-3 pb-[max(18px,env(safe-area-inset-bottom))] space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] grid place-items-center shrink-0"><Target size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-playfair text-xl font-bold leading-tight">{prenom ? `${prenom}, vos missions` : "Vos missions"}</h2>
            <p className="text-xs text-white/60">Compte gratuit · découvrez la couture avec nous, à votre rythme.</p>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="p-2 -m-1 rounded-full hover:bg-white/10"><X size={20} /></button>
        </div>
        {m.migration ? <p className="rounded-xl bg-amber-400/10 border border-amber-300/30 px-3 py-2 text-xs text-amber-100">{m.migration}</p> : null}
        {message ? <p role="status" className="rounded-xl bg-emerald-400/10 border border-emerald-300/30 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}

        {/* 1 · Bienvenue */}
        <section aria-labelledby="m-bienvenue">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={17} className="text-orange-300" aria-hidden />
            <h3 id="m-bienvenue" className="font-semibold">Mission de bienvenue</h3>
            <span className="ms-auto text-xs font-bold text-white/70">{faites} / {m.etapes.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3" aria-hidden>
            <div className="h-full bg-gradient-to-r from-[#FE7223] to-[#5B16F9] transition-all" style={{ width: `${(faites / m.etapes.length) * 100}%` }} />
          </div>
          {m.cadeau ? (
            <div className="rounded-2xl bg-gradient-to-br from-[#FE7223] to-[#5B16F9] p-4 mb-3 text-center">
              <div className="text-2xl" aria-hidden>🎁</div>
              <div className="font-bold">Bravo, mission accomplie !</div>
              {m.cadeau === "bientot" ? (
                <p className="text-sm text-white/90 mt-1">Votre cadeau arrive : l&apos;équipe Arazzo prépare un code promo, revenez très vite.</p>
              ) : (
                <>
                  <p className="text-sm text-white/90 mt-1">Votre code promo{m.cadeau.detail ? ` — ${m.cadeau.detail}` : ""} :</p>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText((m.cadeau as { code: string }).code).then(() => setCopie(true)).catch(() => {}); }}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white text-[#2A0880] px-4 py-2 font-black tracking-widest">
                    {m.cadeau.code} <Copy size={15} aria-hidden /><span className="sr-only">Copier le code</span>
                  </button>
                  <div className="text-xs text-white/85 mt-1">{copie ? "Code copié ✓" : "Touchez pour copier"}</div>
                  <Link href={m.rejoindre.href} className="mt-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-4 py-2 text-sm font-semibold">Utiliser mon code · {m.rejoindre.titre} <ChevronRight size={15} /></Link>
                </>
              )}
            </div>
          ) : <p className="text-xs text-white/60 mb-2">Terminez les 4 étapes : un code promo vous attend à la fin.</p>}
          <ul className="space-y-2">
            {m.etapes.map((e) => (
              <Etape key={e.cle} fait={e.fait} titre={e.titre} detail={e.cle === "test" && !e.fait ? `${e.detail} Laissez votre e-mail à la fin pour valider l'étape.` : e.detail}
                action={
                  e.cle === "test" ? <button type="button" className={btn} onClick={() => setTest(true)}>Commencer</button>
                  : e.cle === "suivre" && m.enseignante ? <button type="button" className={btn} onClick={suivreEnseignante} disabled={suivre}>{suivre ? "…" : "Suivre"}</button>
                  : e.cle === "aimer" ? <button type="button" className={btn} onClick={onFermer}>Voir le feed</button>
                  : e.cle === "question" ? <button type="button" className={btn} onClick={() => { onFermer(); ouvrirStories(); }}>Ouvrir</button>
                  : null
                } />
            ))}
          </ul>
          {m.enseignante && !m.etapes.find((e) => e.cle === "suivre")?.fait ? (
            <Link href={`/communaute/u/${m.enseignante.id}`} className="mt-2 flex items-center gap-2 text-xs text-white/70 hover:text-white">
              <span className="w-7 h-7 rounded-full overflow-hidden bg-white/15 grid place-items-center font-bold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.enseignante.avatar ? <img src={m.enseignante.avatar} alt="" className="w-full h-full object-cover" /> : m.enseignante.nom.charAt(0)}
              </span>
              Votre enseignante : {m.enseignante.nom} — voir son profil
            </Link>
          ) : null}
        </section>

        {/* 2 · Leçon d'essai */}
        <section aria-labelledby="m-essai" className="rounded-2xl bg-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-1">
            <PlayCircle size={17} className="text-sky-300" aria-hidden />
            <h3 id="m-essai" className="font-semibold">Leçon d&apos;essai gratuite</h3>
            {m.essai?.vue ? <span className="ms-auto rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold px-2 py-0.5">Regardée ✓</span> : null}
          </div>
          {m.essai ? (
            <>
              <p className="text-sm text-white/80">« {m.essai.titre} » — une vraie leçon de la formation {m.essai.cours}, offerte.</p>
              <Link href={`/dashboard/cours/${m.essai.lessonId}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white text-[#2A0880] px-4 py-2 text-sm font-bold">
                <PlayCircle size={16} aria-hidden /> {m.essai.vue ? "La revoir" : "Regarder ma leçon"}
              </Link>
            </>
          ) : <p className="text-sm text-white/60">Votre leçon d&apos;essai arrive très bientôt.</p>}
        </section>

        {/* 3 · Défi de la semaine */}
        <section aria-labelledby="m-defi" className="rounded-2xl bg-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={17} className="text-amber-300" aria-hidden />
            <h3 id="m-defi" className="font-semibold">Défi couture de la semaine</h3>
          </div>
          {m.defi ? (
            <>
              <div className="font-semibold text-orange-200">{m.defi.titre}</div>
              {m.defi.consigne ? <p className="text-sm text-white/80 whitespace-pre-wrap mt-1">{m.defi.consigne}</p> : null}
              <p className="text-xs text-white/55 mt-1">Fin dans {tempsRestant(m.defi.fin, new Date())} · {m.defi.participations} participation{m.defi.participations > 1 ? "s" : ""} · une récompense pour la plus belle réalisation</p>
              {m.defi.maParticipation === "en_attente" ? <p className="mt-2 text-sm text-amber-100">🕒 Votre photo attend la validation de l&apos;équipe.</p>
                : m.defi.maParticipation === "publiee" ? <p className="mt-2 text-sm text-emerald-200">✓ Vous participez ! Votre photo est dans le feed.</p>
                : defiOuvert ? (
                  <form onSubmit={envoyerDefi} className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 rounded-xl border border-dashed border-white/30 px-3 py-3 text-sm cursor-pointer hover:bg-white/5">
                      <Camera size={18} aria-hidden /> {photo ? photo.name : "Choisir la photo de ma réalisation"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                    </label>
                    <input value={legende} onChange={(e) => setLegende(e.target.value)} maxLength={150} placeholder="Un mot sur votre réalisation (facultatif)"
                      className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm placeholder:text-white/40 outline-none" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDefiOuvert(false)} className="rounded-full border border-white/20 px-4 py-2 text-sm">Annuler</button>
                      <button type="submit" disabled={!photo || envoi} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#5B16F9] to-[#FE7223] px-4 py-2 text-sm font-bold disabled:opacity-50">
                        {envoi ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />} Participer
                      </button>
                    </div>
                  </form>
                ) : <button type="button" onClick={() => setDefiOuvert(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white text-[#2A0880] px-4 py-2 text-sm font-bold"><Camera size={15} /> Je participe</button>}
            </>
          ) : <p className="text-sm text-white/60">Le prochain défi arrive bientôt : restez connectée !</p>}
        </section>

        {/* 4 · Mes envies */}
        <section aria-labelledby="m-envies" className="rounded-2xl bg-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={17} className="text-pink-300" aria-hidden />
            <h3 id="m-envies" className="font-semibold">J&apos;aimerais apprendre ces modèles</h3>
          </div>
          {m.envies.length ? (
            <ul className="mt-2 space-y-2">
              {m.envies.map((e) => (
                <li key={e.mediaId} className="flex items-center gap-3">
                  <span className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.miniature ? <img src={e.miniature} alt="" className="w-full h-full object-cover" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{e.titre}</div>
                    <Link href={e.formation.href} className="text-xs text-orange-200 hover:underline">S&apos;apprend en {e.formation.titre} →</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-white/60">Touchez « J&apos;apprends » ✨ sur une vidéo du feed pour garder le modèle ici : on vous dit dans quelle formation il s&apos;apprend.</p>}
          <p className="mt-2 text-[11px] text-white/45">Votre enseignante voit les modèles qui vous plaisent, pour mieux vous conseiller.</p>
        </section>

        {/* 5 · Rejoindre une classe */}
        <Link href={m.rejoindre.href} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#5B16F9] to-[#2A0880] p-4">
          <GraduationCap size={26} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Rejoindre une classe · {m.rejoindre.titre}</span>
            <span className="block text-xs text-white/80">Publiez sans attendre, ayez votre enseignante et vos camarades de groupe.</span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </Link>
      </div>

      {test ? createPortal(
        <div className="pl" style={PORTEE_KIT} onClick={(e) => e.stopPropagation()}>
          <LandingStyles />
          <LevelTestPopup slug={SLUG_TEST} langue="fr" utm={{ utm_source: "feed-missions" }} promo={null}
            contactInitial={{ first_name: prenom, email: email ?? "" }}
            onResult={() => onMaj()} onClose={() => { setTest(false); onMaj(); }} />
        </div>, document.body) : null}
    </div>
  );
}

/**
 * La bulle « Missions » en tête de la barre de stories du feed (comptes sans formation seulement),
 * et son panneau. S'ouvre seule à la première visite.
 */
export function BulleMissions({ initial, email, prenom }: { initial: MissionsVue; email: string | null; prenom: string }) {
  const [m, setM] = useState(initial);
  const [ouvert, setOuvert] = useState(false);
  const monte = useRef(false);
  useEffect(() => { setM(initial); }, [initial]);
  useEffect(() => {
    if (monte.current) return;
    monte.current = true;
    try {
      if (!localStorage.getItem(CLE_VU)) { localStorage.setItem(CLE_VU, "1"); setOuvert(true); }
    } catch { /* stockage indisponible : on ne l'ouvre pas d'office */ }
  }, []);
  const maj = useCallback(() => { missionsDuFeed().then((x) => { if (x) setM(x); }).catch(() => {}); }, []);
  const faites = m.etapes.filter((e) => e.fait).length;
  const reste = m.etapes.length - faites;

  return (
    <li className="shrink-0">
      <button type="button" onClick={() => { setOuvert(true); maj(); }} className="flex flex-col items-center gap-1 w-[62px]" aria-label={`Vos missions : ${faites} sur ${m.etapes.length} faites`}>
        <span className="relative block w-[57px] h-[57px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#FACC15] via-[#FE7223] to-[#5B16F9]">
          <span className="w-full h-full rounded-full bg-[#140f2b] grid place-items-center text-2xl" aria-hidden>{m.cadeau ? "🎁" : "🎯"}</span>
          {reste > 0 ? <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] rounded-full bg-[#FE7223] text-white text-[10px] font-bold grid place-items-center px-1 ring-2 ring-[#0b0818]">{reste}</span> : null}
        </span>
        <span className="text-[10px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,.8)]">Missions</span>
      </button>
      {ouvert ? createPortal(<Panneau m={m} email={email} prenom={prenom} onFermer={() => setOuvert(false)} onMaj={maj} />, document.body) : null}
    </li>
  );
}
