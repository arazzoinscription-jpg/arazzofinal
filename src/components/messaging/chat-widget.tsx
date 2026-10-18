"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, X, Send, ArrowLeft, Search, Loader2, PenSquare, Mic, Image as ImageIcon, Trash2, Video } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  loadInbox, loadConversation, sendChatMessage, searchContacts, getUnreadCount, sendChatPiece,
  preparerVideoMessage, finaliserVideoMessage,
} from "@/app/actions/messaging";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_MAX_S, BUCKET_MESSAGES, VIDEO_MAX_S, dureeLisible } from "@/lib/messagerie-pieces";
import { BulleVideo, EnregistreurVideo, LecteurVocal, PhotoEnGrand, compresserImage, formatEnregistrement } from "./pieces";
import { useAutorisationMedia } from "./guide-autorisation";

type Role = "eleve" | "formateur" | "patronniste" | "admin";
interface Contact { id: string; nom: string; role: Role; avatar_url: string | null; group?: string }
interface Conv { otherId: string; nom: string; role: Role; avatar_url: string | null; lastBody: string; lastAt: string; unread: number }
interface Piece { kind: "image" | "audio" | "video"; url: string | null; duree: number | null }
interface Msg { id: string; from_user: string; to_user: string; body: string; created_at: string; mine: boolean; piece?: Piece | null }

/**
 * Les liens des photos et vocaux sont temporaires (stockage privé) et changent à chaque rechargement :
 * on garde ceux déjà affichés (sinon les photos clignotent toutes les 6 s), sauf s'ils ont plus de 40 min.
 */
const RECU = new Map<string, number>();
function garderLiens(avant: Msg[], apres: Msg[]): Msg[] {
  const parId = new Map(avant.map((m) => [m.id, m]));
  return apres.map((m) => {
    const ancien = parId.get(m.id);
    if (!m.piece?.url) return m;
    if (ancien?.piece?.url && Date.now() - (RECU.get(m.id) ?? 0) < 40 * 60_000) return { ...m, piece: { ...m.piece, url: ancien.piece.url } };
    RECU.set(m.id, Date.now());
    return m;
  });
}

const ROLE_LABEL: Record<Role, string> = { eleve: "Élève", formateur: "Formateur", patronniste: "Patronniste", admin: "Admin" };
const initial = (n: string) => (n?.[0] ?? "?").toUpperCase();

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Caméra / micro : explication avant la demande du navigateur, guide pas à pas après un refus.
  const autorisation = useAutorisationMedia();
  // Messagerie ouverte : les boutons flottants de gauche se cachent (sur téléphone, elle prend toute la largeur).
  useEffect(() => {
    document.documentElement.toggleAttribute("data-chat-ouvert", open);
    return () => document.documentElement.removeAttribute("data-chat-ouvert");
  }, [open]);
  const [view, setView] = useState<"list" | "contacts" | "conv">("list");
  const [role, setRole] = useState<Role>("eleve");
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<{ id: string; nom: string; role: Role; avatar: string | null } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [enreg, setEnreg] = useState<{ secondes: number } | null>(null);
  const [camera, setCamera] = useState(false);
  const champPhoto = useRef<HTMLInputElement>(null);
  const enregistreur = useRef<{ rec: MediaRecorder; flux: MediaStream; morceaux: Blob[]; debut: number; minuteur: number; annule: boolean } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Badge non-lus (au montage + toutes les 25 s)
  useEffect(() => {
    let alive = true;
    const tick = () => getUnreadCount().then((n) => { if (alive) setUnread(n); }).catch(() => {});
    tick();
    const iv = setInterval(tick, 25000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  async function refreshInbox() {
    setLoading(true);
    const res = await loadInbox();
    setLoading(false);
    if (res.ok) { setConversations(res.conversations); setContacts(res.contacts); setRole(res.role); }
  }

  function openWidget() {
    setOpen(true); setView("list"); setActive(null);
    refreshInbox();
  }

  async function openConversation(otherId: string, nom: string, r: Role, avatar: string | null = null) {
    setActive({ id: otherId, nom, role: r, avatar }); setView("conv"); setMessages([]);
    const res = await loadConversation(otherId);
    if (res.ok) { setMessages((avant) => garderLiens(avant, res.messages as Msg[])); setUnread((u) => Math.max(0, u - (conversations.find((c) => c.otherId === otherId)?.unread ?? 0))); }
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }

  // Ouverture depuis un autre écran (ex. « Ma classe ») : événement `arazzo:messagerie`,
  // éventuellement sur une élève précise avec un brouillon. N'ENVOIE RIEN : l'utilisatrice
  // relit et appuie elle-même sur « Envoyer ».
  useEffect(() => {
    function ouvrir(e: Event) {
      const d = (e as CustomEvent<{ id?: string; nom?: string; texte?: string }>).detail ?? {};
      setOpen(true);
      refreshInbox();
      if (d.id) {
        openConversation(d.id, d.nom ?? "Élève", "eleve");
        if (d.texte) setText(d.texte);
      } else {
        setView("list"); setActive(null);
      }
    }
    window.addEventListener("arazzo:messagerie", ouvrir);
    return () => window.removeEventListener("arazzo:messagerie", ouvrir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rafraîchit la conversation ouverte toutes les 6 s
  useEffect(() => {
    if (view !== "conv" || !active) return;
    const iv = setInterval(async () => {
      const res = await loadConversation(active.id);
      if (res.ok) setMessages((avant) => garderLiens(avant, res.messages as Msg[]));
    }, 6000);
    return () => clearInterval(iv);
  }, [view, active]);

  function send() {
    const body = text.trim();
    if (!body || !active) return;
    setText("");
    // Optimiste
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: "me", to_user: active.id, body, created_at: new Date().toISOString(), mine: true };
    setMessages((m) => [...m, temp]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
    start(async () => {
      const res = await sendChatMessage(active.id, body);
      if (!res.ok) { toast(res.error ?? "Envoi impossible", "error"); setMessages((m) => m.filter((x) => x.id !== temp.id)); setText(body); }
      else { const c = await loadConversation(active.id); if (c.ok) setMessages((avant) => garderLiens(avant, c.messages as Msg[])); }
    });
  }

  // ── Photos, messages vocaux et vidéos rondes ───────────────────────────────
  /**
   * Vidéo ronde : envoyée DIRECTEMENT du téléphone au stockage privé (lien d'envoi préparé par le serveur
   * après vérification des droits), puis le message part.
   */
  function envoyerVideo(fichier: File, duree: number) {
    if (!active) return;
    const dest = active.id;
    const apercu = URL.createObjectURL(fichier);
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: "me", to_user: dest, body: "", created_at: new Date().toISOString(), mine: true, piece: { kind: "video", url: apercu, duree } };
    setMessages((m) => [...m, temp]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
    start(async () => {
      const echec = (msg: string) => { toast(msg, "error"); setMessages((m) => m.filter((x) => x.id !== temp.id)); };
      const p = await preparerVideoMessage({ toId: dest, type: fichier.type, taille: fichier.size, duree });
      if (!p.ok) { echec(p.error); URL.revokeObjectURL(apercu); return; }
      const up = await createClient().storage.from(BUCKET_MESSAGES).uploadToSignedUrl(p.chemin, p.jeton, fichier, { contentType: p.type });
      if (up.error) { echec("Envoi de la vidéo impossible, réessayez."); URL.revokeObjectURL(apercu); return; }
      const res = await finaliserVideoMessage({ toId: dest, chemin: p.chemin, duree });
      if (!res.ok) echec(res.error ?? "Envoi impossible");
      else { const c = await loadConversation(dest); if (c.ok) setMessages((avant) => garderLiens(avant, c.messages as Msg[])); }
      URL.revokeObjectURL(apercu);
    });
  }

  function envoyerPiece(kind: "image" | "audio", fichier: File, duree: number | null) {
    if (!active) return;
    const dest = active.id;
    const apercu = URL.createObjectURL(fichier);
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: "me", to_user: dest, body: "", created_at: new Date().toISOString(), mine: true, piece: { kind, url: apercu, duree } };
    setMessages((m) => [...m, temp]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
    start(async () => {
      const fd = new FormData();
      fd.append("toId", dest);
      fd.append("kind", kind);
      fd.append("fichier", fichier);
      if (duree) fd.append("duree", String(duree));
      const res = await sendChatPiece(fd);
      if (!res.ok) { toast(res.error ?? "Envoi impossible", "error"); setMessages((m) => m.filter((x) => x.id !== temp.id)); }
      else { const c = await loadConversation(dest); if (c.ok) setMessages((avant) => garderLiens(avant, c.messages as Msg[])); }
      URL.revokeObjectURL(apercu);
    });
  }

  async function choisirPhoto(f: File | null) {
    if (!f) return;
    envoyerPiece("image", await compresserImage(f), null);
  }

  async function demarrerVocal() {
    if (enregistreur.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast("Votre navigateur ne permet pas d'enregistrer un message vocal.", "error"); return; }
    if (!(await autorisation.preparer("micro", () => void demarrerVocal()))) return;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const format = formatEnregistrement();
      const rec = new MediaRecorder(flux, format ? { mimeType: format } : undefined);
      const etat = { rec, flux, morceaux: [] as Blob[], debut: Date.now(), minuteur: 0, annule: false };
      rec.ondataavailable = (e) => { if (e.data.size) etat.morceaux.push(e.data); };
      rec.onstop = () => {
        window.clearInterval(etat.minuteur);
        flux.getTracks().forEach((t) => t.stop());
        enregistreur.current = null;
        setEnreg(null);
        if (etat.annule) return;
        const secondes = Math.max(1, Math.round((Date.now() - etat.debut) / 1000));
        const type = (rec.mimeType || format || "audio/webm").split(";")[0];
        const blob = new Blob(etat.morceaux, { type });
        if (blob.size < 100) { toast("Message vocal vide, réessayez.", "error"); return; }
        envoyerPiece("audio", new File([blob], `vocal.${type.includes("mp4") ? "m4a" : type.split("/")[1]}`, { type }), Math.min(AUDIO_MAX_S, secondes));
      };
      etat.minuteur = window.setInterval(() => {
        const s = Math.round((Date.now() - etat.debut) / 1000);
        setEnreg({ secondes: s });
        if (s >= AUDIO_MAX_S && rec.state === "recording") rec.stop();
      }, 250);
      enregistreur.current = etat;
      rec.start(250);
      setEnreg({ secondes: 0 });
    } catch (e) {
      const message = autorisation.echec("micro", e, () => void demarrerVocal());
      if (message) toast(message, "error");
    }
  }

  /** 🎥 Vidéo ronde : explication / guide d'autorisation d'abord, puis l'enregistreur. */
  async function ouvrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast("Votre navigateur ne permet pas d'enregistrer une vidéo ici.", "error"); return; }
    if (await autorisation.preparer("camera", () => void ouvrirCamera())) setCamera(true);
  }

  function arreterVocal(annuler: boolean) {
    const e = enregistreur.current;
    if (!e) return;
    e.annule = annuler;
    if (e.rec.state !== "inactive") e.rec.stop();
  }

  // Conversation fermée pendant un enregistrement : on l'annule (le micro s'éteint).
  useEffect(() => { if (!open || view !== "conv") arreterVocal(true); }, [open, view]);

  // Recherche contacts (admin) avec petit debounce
  useEffect(() => {
    if (view !== "contacts" || role !== "admin") return;
    const t = setTimeout(async () => {
      const res = await searchContacts(q);
      if (res.ok) setContacts(res.contacts);
    }, 300);
    return () => clearTimeout(t);
  }, [q, view, role]);

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const g = c.group ?? "Contacts"; (acc[g] ??= []).push(c); return acc;
  }, {});

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => (open ? setOpen(false) : openWidget())}
        aria-label="Messagerie"
        className="fixed z-40 bottom-24 lg:bottom-6 end-4 lg:end-6 flex items-center justify-center w-14 h-14 rounded-full bg-[#6B21C8] text-white shadow-lg shadow-black/20 hover:scale-105 hover:bg-[#5a1bb0] transition-transform"
      >
        {open ? <X size={24} /> : <MessageSquare size={24} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold grid place-items-center">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="fixed z-50 bottom-40 lg:bottom-24 end-4 lg:end-6 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[560px] max-h-[70vh] bg-white dark:bg-[#15102b] rounded-2xl shadow-2xl border border-cream-200 dark:border-white/10 flex flex-col overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#6B21C8] text-white shrink-0">
            {view === "conv" || view === "contacts" ? (
              <button onClick={() => { setView("list"); setActive(null); }} className="hover:opacity-80"><ArrowLeft size={20} /></button>
            ) : null}
            {view === "conv" && active ? (
              <Link href={`/communaute/u/${active.id}`} onClick={() => setOpen(false)} title={`Voir le profil de ${active.nom}`}
                className="flex-1 min-w-0 flex items-center gap-2 hover:opacity-90">
                {active.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={active.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/40" />
                  : <span className="w-8 h-8 rounded-full bg-white/20 grid place-items-center font-bold text-sm shrink-0">{initial(active.nom)}</span>}
                <span className="min-w-0">
                  <span className="block font-semibold truncate underline-offset-2 hover:underline">{active.nom}</span>
                  <span className="block text-[11px] text-white/75 leading-tight">Voir le profil</span>
                </span>
              </Link>
            ) : (
              <span className="font-semibold flex-1 truncate">{view === "contacts" ? "Nouveau message" : "Messagerie"}</span>
            )}
            {view === "list" && (
              <button onClick={() => { setView("contacts"); if (role === "admin") setContacts([]); }} title="Nouveau message" className="hover:opacity-80"><PenSquare size={18} /></button>
            )}
            <button onClick={() => setOpen(false)} className="hover:opacity-80"><X size={20} /></button>
          </div>

          {/* Corps */}
          <div className="flex-1 min-h-0 flex flex-col">
            {view === "list" && (
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-gray-400"><Loader2 className="animate-spin inline" size={20} /></div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Aucune conversation. Cliquez sur ✎ pour en démarrer une.</div>
                ) : conversations.map((c) => (
                  <button key={c.otherId} onClick={() => openConversation(c.otherId, c.nom, c.role, c.avatar_url)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 dark:hover:bg-white/5 text-start border-b border-cream-100 dark:border-white/5">
                    <Avatar nom={c.nom} url={c.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">{c.nom}</span>
                        {c.unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold grid place-items-center">{c.unread}</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{c.lastBody}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {view === "contacts" && (
              <div className="flex-1 overflow-y-auto">
                {role === "admin" && (
                  <div className="p-3 sticky top-0 bg-white dark:bg-[#15102b] border-b border-cream-100 dark:border-white/5">
                    <div className="relative">
                      <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une personne…"
                        className="w-full ps-9 pe-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/40" />
                    </div>
                  </div>
                )}
                {contacts.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">{role === "admin" ? "Recherchez une personne à contacter." : "Aucun contact disponible."}</div>
                ) : Object.entries(grouped).map(([g, list]) => (
                  <div key={g}>
                    <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-gray-400 bg-cream-50 dark:bg-white/5">{g}</div>
                    {list.map((c) => (
                      <button key={c.id} onClick={() => openConversation(c.id, c.nom, c.role, c.avatar_url)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream-50 dark:hover:bg-white/5 text-start">
                        <Avatar nom={c.nom} url={c.avatar_url} />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate text-sm">{c.nom}</div>
                          <div className="text-[11px] text-gray-400">{ROLE_LABEL[c.role]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {view === "conv" && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-cream-50/40 dark:bg-black/10">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm mt-6">Démarrez la conversation 👋</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                      <div className={m.piece?.kind === "video" && !m.body ? "max-w-[78%]" : `max-w-[78%] ${m.piece?.kind === "image" ? "p-1" : "px-3 py-2"} rounded-2xl text-sm ${m.mine ? "bg-[#6B21C8] text-white rounded-ee-sm" : "bg-white dark:bg-white/10 text-gray-800 dark:text-white border border-cream-200 dark:border-white/10 rounded-es-sm"}`}>
                        {m.piece?.kind === "image" ? (
                          m.piece.url ? (
                            <button type="button" onClick={() => setPhoto(m.piece!.url)} aria-label="Voir la photo en grand" className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.piece.url} alt="Photo" className="rounded-xl max-h-60 w-auto object-cover" />
                            </button>
                          ) : <span className="block px-2 py-1 text-xs opacity-70">📷 Photo indisponible</span>
                        ) : m.piece?.kind === "audio" ? (
                          <LecteurVocal url={m.piece.url} duree={m.piece.duree} mine={m.mine} />
                        ) : m.piece?.kind === "video" ? (
                          <BulleVideo url={m.piece.url} duree={m.piece.duree} />
                        ) : null}
                        {m.body ? <div className={m.piece?.kind === "image" ? "px-2 pt-1 pb-0.5" : m.piece ? "mt-1" : ""}>{m.body}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
                {enreg ? (
                  <div className="p-2.5 border-t border-cream-200 dark:border-white/10 flex items-center gap-2 shrink-0" role="status" aria-live="polite">
                    <button type="button" onClick={() => arreterVocal(true)} aria-label="Annuler le message vocal"
                      className="w-10 h-10 rounded-full grid place-items-center text-red-600 hover:bg-red-50 dark:hover:bg-white/10 shrink-0"><Trash2 size={18} /></button>
                    <span className="flex-1 flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                      Enregistrement… {dureeLisible(enreg.secondes)} <span className="text-xs text-gray-400">/ {dureeLisible(AUDIO_MAX_S)}</span>
                    </span>
                    <button type="button" onClick={() => arreterVocal(false)} aria-label="Envoyer le message vocal"
                      className="w-10 h-10 rounded-full bg-[#6B21C8] text-white grid place-items-center hover:bg-[#5a1bb0] shrink-0"><Send size={17} /></button>
                  </div>
                ) : (
                  <div className="p-2.5 border-t border-cream-200 dark:border-white/10 flex items-end gap-1.5 shrink-0">
                    <input ref={champPhoto} type="file" accept="image/*" className="hidden" onChange={(e) => { void choisirPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                    <button type="button" onClick={() => champPhoto.current?.click()} disabled={pending} aria-label="Envoyer une photo"
                      className="w-10 h-10 rounded-full grid place-items-center text-[#6B21C8] dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-white/10 disabled:opacity-50 shrink-0"><ImageIcon size={19} /></button>
                    <button type="button" onClick={() => void ouvrirCamera()} disabled={pending} aria-label="Enregistrer une vidéo (1 minute)"
                      className="w-10 h-10 rounded-full grid place-items-center text-[#6B21C8] dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-white/10 disabled:opacity-50 shrink-0"><Video size={20} /></button>
                    <textarea
                      value={text} onChange={(e) => setText(e.target.value)} rows={1}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Votre message…"
                      className="flex-1 resize-none max-h-24 rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/40" />
                    {text.trim() ? (
                      <button onClick={send} disabled={pending} aria-label="Envoyer"
                        className="w-10 h-10 rounded-full bg-[#6B21C8] text-white grid place-items-center hover:bg-[#5a1bb0] disabled:opacity-50 shrink-0">
                        {pending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                      </button>
                    ) : (
                      <button type="button" onClick={() => void demarrerVocal()} disabled={pending} aria-label="Enregistrer un message vocal"
                        className="w-10 h-10 rounded-full bg-[#6B21C8] text-white grid place-items-center hover:bg-[#5a1bb0] disabled:opacity-50 shrink-0">
                        {pending ? <Loader2 size={17} className="animate-spin" /> : <Mic size={18} />}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {photo ? <PhotoEnGrand url={photo} onFermer={() => setPhoto(null)} /> : null}
      {camera ? (
        <EnregistreurVideo maxS={VIDEO_MAX_S} onFermer={() => setCamera(false)} onEnvoyer={envoyerVideo}
          onRefus={(e) => { setCamera(false); const message = autorisation.echec("camera", e, () => void ouvrirCamera()); if (message) toast(message, "error"); }} />
      ) : null}
      {autorisation.rendu}
    </>
  );
}

function Avatar({ nom, url }: { nom: string; url: string | null }) {
  return url
    ? <img src={url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    : <span className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 grid place-items-center font-bold shrink-0">{initial(nom)}</span>;
}
