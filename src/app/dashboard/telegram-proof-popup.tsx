"use client";

import { useState } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTelegramProofUploadUrl, recordTelegramProof } from "./telegram-proof-actions";

/**
 * Popup (refermable) pour les étudiantes importées (inscription à 0 DA, déjà
 * payées sur Telegram) : rappelle l'obligation de téléverser la preuve du
 * paiement déjà effectué sur Telegram. Réapparaît à chaque visite tant que la
 * preuve n'est pas envoyée. Ne crée aucune inscription payante (pas de gains).
 */
export function TelegramProofPopup() {
  const [open, setOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function submit() {
    if (!file) { setErr("Choisissez une image ou un PDF de votre preuve."); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Fichier trop lourd (max 10 Mo)."); return; }
    setErr(""); setBusy(true);
    try {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      const prep = await createTelegramProofUploadUrl(ext);
      if (!prep.ok) { setErr(prep.error); return; }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("proofs").uploadToSignedUrl(prep.path, prep.token, file);
      if (upErr) { setErr("Échec de l'envoi du fichier. Réessayez."); return; }
      const ft = ext === "jpeg" ? "jpg" : ext;
      const rec = await recordTelegramProof(prep.path, ft, file.size);
      if (!rec.ok) { setErr(rec.error); return; }
      setDone(true);
    } catch {
      setErr("Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="tg-proof-title">
      <div className="relative w-full max-w-md bg-white dark:bg-[#15111f] rounded-3xl shadow-2xl border border-cream-200 dark:border-white/10 overflow-hidden">
        <button onClick={() => setOpen(false)} aria-label="Fermer"
          className="absolute top-3.5 end-3.5 z-10 w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 flex items-center justify-center text-gray-500 dark:text-white/70">
          <X size={18} />
        </button>

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-2">Preuve reçue ✅</h2>
            <p className="text-gray-600 dark:text-white/70 font-dm mb-6">
              Merci ! Votre preuve de paiement Telegram a bien été enregistrée. Notre équipe la vérifiera.
            </p>
            <button onClick={() => setOpen(false)}
              className="w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold hover:bg-violet-700">
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={22} />
              </span>
              <h2 id="tg-proof-title" className="font-playfair text-xl font-bold text-gray-900 dark:text-white">
                Preuve de paiement requise
              </h2>
            </div>
            <p className="text-gray-600 dark:text-white/70 font-dm text-sm leading-relaxed mb-5">
              Votre compte a été importé depuis Telegram. Pour confirmer votre accès, vous devez
              <strong> téléverser la preuve du paiement déjà effectué sur Telegram</strong> (capture d'écran
              du reçu ou du virement). C'est obligatoire et ne vous sera demandé qu'une seule fois.
            </p>

            <label className="block">
              <span className="sr-only">Fichier de preuve</span>
              <div className="flex items-center gap-3 border-2 border-dashed border-violet-200 dark:border-white/15 rounded-2xl px-4 py-4 cursor-pointer hover:bg-violet-50/50 dark:hover:bg-white/5">
                <UploadCloud size={22} className="text-violet-500 shrink-0" />
                <span className="text-sm text-gray-600 dark:text-white/70 font-dm truncate">
                  {file ? file.name : "Choisir une image ou un PDF (max 10 Mo)"}
                </span>
                <input type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(""); }} />
              </div>
            </label>

            {err && <p className="text-sm text-red-500 font-dm mt-3">{err}</p>}

            <div className="flex items-center gap-3 mt-5">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-gray-600 dark:text-white/70 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5">
                Plus tard
              </button>
              <button onClick={submit} disabled={busy || !file}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-2xl font-bold hover:bg-orange-600 disabled:opacity-50">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />} Envoyer
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/40 font-dm text-center mt-3">
              Ce rappel réapparaîtra tant que la preuve n'est pas envoyée.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
