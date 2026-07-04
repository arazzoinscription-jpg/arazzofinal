"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { askQuestion } from "@/app/dashboard/cours/[id]/extras-actions";

export interface QReply { id: string; authorName: string; authorRole: string; content: string; created_at: string }
export interface QRow {
  id: string; lessonId: string; studentName: string; lessonTitle: string; courseTitle: string;
  content: string; created_at: string; replies: QReply[]; answered: boolean;
}

export function QuestionsClient({ rows }: { rows: QRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
        <div className="text-5xl mb-3">💬</div>
        <p className="text-gray-400 font-dm">Aucune question d'élève pour le moment.</p>
      </div>
    );
  }
  return <div className="space-y-4">{rows.map((r) => <QuestionCard key={r.id} row={r} />)}</div>;
}

function QuestionCard({ row }: { row: QRow }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function reply() {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const res = await askQuestion(row.lessonId, body, row.id);
      if (res.ok) { setText(""); toast("Réponse envoyée ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white font-dm">{row.studentName}</span>
          <span className="text-xs text-gray-400 font-dm block truncate">{row.lessonTitle}{row.courseTitle ? ` · ${row.courseTitle}` : ""}</span>
        </div>
        {row.answered ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 dark:bg-green-500/15 px-2.5 py-1 rounded-full"><CheckCircle2 size={13} /> Répondu</span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 dark:bg-orange-500/15 px-2.5 py-1 rounded-full"><MessageCircle size={13} /> En attente</span>
        )}
      </div>

      <p className="text-sm text-gray-700 dark:text-white/80 font-dm whitespace-pre-line mb-3">{row.content}</p>

      {row.replies.length > 0 && (
        <div className="space-y-2 mb-3 ps-3 border-s-2 border-cream-200 dark:border-white/10">
          {row.replies.map((rep) => {
            const staff = rep.authorRole === "formateur" || rep.authorRole === "admin";
            return (
              <div key={rep.id} className="text-sm">
                <span className={`font-semibold ${staff ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-white/80"}`}>{rep.authorName}{staff ? " (vous)" : ""} :</span>{" "}
                <span className="text-gray-600 dark:text-white/70 whitespace-pre-line">{rep.content}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
          placeholder="Votre réponse à l'élève…"
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button onClick={reply} disabled={pending || !text.trim()}
          className="inline-flex items-center gap-1.5 bg-orange-DEFAULT bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 shrink-0">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Répondre
        </button>
      </div>
    </div>
  );
}
