"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AtSign, X, Loader2 } from "lucide-react";
import { setCommunityUsername } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

const SEEN_KEY = "arazzo-pseudo-prompt-seen";

/**
 * Popup d'onboarding affiché UNE SEULE FOIS aux élèves sans pseudo : les invite à
 * choisir un pseudonyme pour la communauté (éviter d'exposer leur vrai nom).
 */
export function PseudoPrompt({ hasUsername }: { hasUsername: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (hasUsername) return;
    try { if (localStorage.getItem(SEEN_KEY) === "1") return; } catch {}
    setShow(true);
  }, [hasUsername]);

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }
  function dismiss() { markSeen(); setShow(false); }

  function save() {
    if (!value.trim()) { toast("Choisissez un pseudo.", "error"); return; }
    start(async () => {
      const res = await setCommunityUsername(value.trim());
      if (res.ok) { markSeen(); setShow(false); toast(`Pseudo enregistré : @${res.username} ✅`, "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#15102b] shadow-2xl border border-cream-200 dark:border-white/10 p-6">
        <button onClick={dismiss} aria-label="Fermer" className="absolute top-3 end-3 text-gray-400 hover:text-gray-700 dark:hover:text-white/80"><X size={18} /></button>
        <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white grid place-items-center mb-3"><AtSign size={22} /></div>
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Choisissez votre pseudo</h2>
        <p className="text-sm text-gray-500 dark:text-white/60 font-dm mt-1.5">
          Dans la communauté, on utilise un <strong>pseudo</strong> (pas votre vrai nom) pour protéger votre vie privée. Vous pourrez le changer plus tard dans votre profil.
        </p>
        <div className="mt-4 flex items-center rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-3">
          <span className="text-gray-400">@</span>
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            placeholder="votre_pseudo" maxLength={20} dir="ltr"
            className="flex-1 bg-transparent px-1.5 py-2.5 text-sm focus:outline-none text-gray-900 dark:text-white" />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={dismiss} className="flex-1 border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 py-2.5 rounded-xl font-semibold text-sm">Plus tard</button>
          <button onClick={save} disabled={pending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60">
            {pending ? <Loader2 size={15} className="animate-spin" /> : null} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
