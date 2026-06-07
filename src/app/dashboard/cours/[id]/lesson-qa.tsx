"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2, Send, Trash2, CornerDownRight } from "lucide-react";
import { askQuestion, deleteQuestion } from "./extras-actions";

export interface QA {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  authorName: string;
  authorRole: string;
}

function roleBadge(role: string) {
  if (role === "formateur") return "Formatrice";
  if (role === "admin") return "Admin";
  return null;
}

export function LessonQA({ lessonId, items, meId, isStaff }: { lessonId: string; items: QA[]; meId: string; isStaff: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, start] = useTransition();

  const roots = items.filter((q) => !q.parent_id);
  const repliesOf = (id: string) => items.filter((q) => q.parent_id === id);

  function post(text: string, parentId: string | null, reset: () => void) {
    if (text.trim().length < 2) return;
    start(async () => {
      const res = await askQuestion(lessonId, text, parentId);
      if (res.ok) { reset(); setReplyTo(null); router.refresh(); }
      else alert(res.error || "Erreur");
    });
  }
  function del(id: string) {
    start(async () => { await deleteQuestion(id); router.refresh(); });
  }

  return (
    <div className="mt-8 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5">
      <h2 className="flex items-center gap-2 font-playfair text-xl font-bold text-gray-900 dark:text-white mb-4">
        <MessageCircle size={20} className="text-violet-600 dark:text-violet-300" /> Questions / Réponses
      </h2>

      {/* Poser une question */}
      <div className="flex gap-2 mb-5">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post(content, null, () => setContent(""))}
          placeholder="Posez votre question à la formatrice…"
          className="flex-1 border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button onClick={() => post(content, null, () => setContent(""))} disabled={pending || content.trim().length < 2}
          className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-4 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>

      {roots.length === 0 ? (
        <p className="text-sm text-gray-400 font-dm">Aucune question pour l'instant. Soyez la première à demander !</p>
      ) : (
        <div className="space-y-4">
          {roots.map((q) => (
            <div key={q.id} className="border-b border-cream-100 dark:border-white/5 pb-4 last:border-0">
              <Bubble q={q} meId={meId} isStaff={isStaff} onDelete={() => del(q.id)} />

              {/* Réponses */}
              <div className="mt-2 space-y-2 ps-6">
                {repliesOf(q.id).map((r) => (
                  <div key={r.id} className="flex items-start gap-1.5">
                    <CornerDownRight size={14} className="text-gray-300 mt-1 flex-shrink-0" />
                    <Bubble q={r} meId={meId} isStaff={isStaff} onDelete={() => del(r.id)} small />
                  </div>
                ))}
              </div>

              {/* Répondre (staff ou auteur de la question) */}
              {(isStaff || q.user_id === meId) && (
                replyTo === q.id ? (
                  <div className="mt-2 ps-6 flex gap-2">
                    <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && post(replyText, q.id, () => setReplyText(""))}
                      placeholder="Votre réponse…"
                      className="flex-1 border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <button onClick={() => post(replyText, q.id, () => setReplyText(""))} disabled={pending}
                      className="bg-violet-700 text-white px-3 rounded-lg text-sm font-semibold hover:bg-violet-800 disabled:opacity-50">Envoyer</button>
                  </div>
                ) : (
                  <button onClick={() => { setReplyTo(q.id); setReplyText(""); }}
                    className="mt-1 ps-6 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline">Répondre</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({ q, meId, isStaff, onDelete, small }: { q: QA; meId: string; isStaff: boolean; onDelete: () => void; small?: boolean }) {
  const badge = roleBadge(q.authorRole);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-gray-900 dark:text-white ${small ? "text-xs" : "text-sm"}`}>{q.authorName}</span>
          {badge && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">{badge}</span>}
          <span className="text-[11px] text-gray-400">{new Date(q.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <p className={`text-gray-700 dark:text-white/70 font-dm whitespace-pre-wrap ${small ? "text-xs" : "text-sm"}`}>{q.content}</p>
      </div>
      {(q.user_id === meId || isStaff) && (
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
      )}
    </div>
  );
}
