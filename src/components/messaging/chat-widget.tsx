"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, X, Send, ArrowLeft, Search, Loader2, PenSquare } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  loadInbox, loadConversation, sendChatMessage, searchContacts, getUnreadCount,
} from "@/app/actions/messaging";

type Role = "eleve" | "formateur" | "patronniste" | "admin";
interface Contact { id: string; nom: string; role: Role; avatar_url: string | null; group?: string }
interface Conv { otherId: string; nom: string; role: Role; avatar_url: string | null; lastBody: string; lastAt: string; unread: number }
interface Msg { id: string; from_user: string; to_user: string; body: string; created_at: string; mine: boolean }

const ROLE_LABEL: Record<Role, string> = { eleve: "Élève", formateur: "Formateur", patronniste: "Patronniste", admin: "Admin" };
const initial = (n: string) => (n?.[0] ?? "?").toUpperCase();

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "contacts" | "conv">("list");
  const [role, setRole] = useState<Role>("eleve");
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<{ id: string; nom: string; role: Role } | null>(null);
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

  async function openConversation(otherId: string, nom: string, r: Role) {
    setActive({ id: otherId, nom, role: r }); setView("conv"); setMessages([]);
    const res = await loadConversation(otherId);
    if (res.ok) { setMessages(res.messages); setUnread((u) => Math.max(0, u - (conversations.find((c) => c.otherId === otherId)?.unread ?? 0))); }
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }

  // Rafraîchit la conversation ouverte toutes les 6 s
  useEffect(() => {
    if (view !== "conv" || !active) return;
    const iv = setInterval(async () => {
      const res = await loadConversation(active.id);
      if (res.ok) setMessages(res.messages);
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
      else { const c = await loadConversation(active.id); if (c.ok) setMessages(c.messages); }
    });
  }

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
        <div className="fixed z-40 bottom-40 lg:bottom-24 end-4 lg:end-6 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[560px] max-h-[70vh] bg-white dark:bg-[#15102b] rounded-2xl shadow-2xl border border-cream-200 dark:border-white/10 flex flex-col overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#6B21C8] text-white shrink-0">
            {view === "conv" || view === "contacts" ? (
              <button onClick={() => { setView("list"); setActive(null); }} className="hover:opacity-80"><ArrowLeft size={20} /></button>
            ) : null}
            <span className="font-semibold flex-1 truncate">
              {view === "conv" ? active?.nom : view === "contacts" ? "Nouveau message" : "Messagerie"}
            </span>
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
                  <button key={c.otherId} onClick={() => openConversation(c.otherId, c.nom, c.role)}
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
                      <button key={c.id} onClick={() => openConversation(c.id, c.nom, c.role)}
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
                      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${m.mine ? "bg-[#6B21C8] text-white rounded-ee-sm" : "bg-white dark:bg-white/10 text-gray-800 dark:text-white border border-cream-200 dark:border-white/10 rounded-es-sm"}`}>
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 border-t border-cream-200 dark:border-white/10 flex items-end gap-2 shrink-0">
                  <textarea
                    value={text} onChange={(e) => setText(e.target.value)} rows={1}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Votre message…"
                    className="flex-1 resize-none max-h-24 rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/40" />
                  <button onClick={send} disabled={pending || !text.trim()}
                    className="w-10 h-10 rounded-full bg-[#6B21C8] text-white grid place-items-center hover:bg-[#5a1bb0] disabled:opacity-50 shrink-0">
                    {pending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Avatar({ nom, url }: { nom: string; url: string | null }) {
  return url
    ? <img src={url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    : <span className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 grid place-items-center font-bold shrink-0">{initial(nom)}</span>;
}
