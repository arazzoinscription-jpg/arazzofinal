"use client";

import { useState, useTransition } from "react";
import { UserPlus, X, Loader2, CheckCircle2 } from "lucide-react";
import { requestEnrollment } from "@/app/actions/enrollment-request";

/**
 * Bouton public « Demande d'enrôlement » + modale de collecte (nom, email,
 * téléphone). Réutilisable sur la liste des formations et la fiche détaillée.
 * Sert à mesurer l'intérêt et à enrôler en masse plus tard (côté admin).
 */
export function EnrollRequestButton({
  courseId,
  courseTitle,
  variant = "card",
}: {
  courseId: string;
  courseTitle: string;
  variant?: "card" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    start(async () => {
      const res = await requestEnrollment({ courseId, ...form });
      if (res.ok) setDone(true);
      else setErr(res.error ?? "Erreur");
    });
  }

  const trigger =
    variant === "primary"
      ? "inline-flex items-center justify-center gap-2 bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-800 active:scale-[0.98] transition-all"
      : "w-full inline-flex items-center justify-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors";

  const field =
    "w-full rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-violet-950 dark:text-white placeholder:text-violet-950/35 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setDone(false); }} className={trigger}>
        <UserPlus size={16} /> Demande d'enrôlement
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-[#15102b] rounded-2xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-4 end-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X size={20} />
            </button>

            {done ? (
              <div className="text-center py-6">
                <span className="inline-flex w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-300 items-center justify-center mb-3">
                  <CheckCircle2 size={28} />
                </span>
                <h3 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Demande envoyée ✅</h3>
                <p className="text-sm text-gray-500 dark:text-white/55 font-dm mt-1">
                  Nous vous recontacterons pour finaliser votre inscription à « {courseTitle} ».
                </p>
                <button onClick={() => setOpen(false)} className="mt-5 bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Demande d'enrôlement</h3>
                  <p className="text-sm text-gray-500 dark:text-white/55 font-dm mt-0.5 line-clamp-2">{courseTitle}</p>
                </div>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Nom complet" className={field} />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="Email" className={field} />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone (facultatif)" className={field} />
                {err && <p className="text-sm text-red-500">{err}</p>}
                <button type="submit" disabled={pending} className="w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-3 rounded-xl font-bold hover:bg-violet-800 active:scale-[0.98] transition-all disabled:opacity-60">
                  {pending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  Envoyer ma demande
                </button>
                <p className="text-[11px] text-gray-400 dark:text-white/40 text-center">Sans engagement — vous serez recontacté(e) pour l'inscription.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
