"use client";

import Link from "next/link";
import { useState } from "react";
import * as tus from "tus-js-client";
import { Camera, Loader2, PartyPopper, Video, X } from "lucide-react";
import { verifierPhotoStory } from "@/lib/stories/regles";
import { DUREE_VIDEO_RESULTAT_MAX_S } from "@/lib/resultats";
import { demarrerResultatVideo, finaliserResultatVideo, publierResultatPhoto } from "@/app/actions/resultats";

/**
 * « Mon modèle est terminé ! » : l'élève publie la photo (ou la vidéo) de son résultat.
 * Alerte « Bravo ! » sur le feed pendant 24 h, puis publication de son profil.
 */
export function PublierResultat({ onPublie, sombre = false }: { onPublie?: () => void; sombre?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [duree, setDuree] = useState<number | null>(null);
  const [legende, setLegende] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [fait, setFait] = useState(false);

  function fermer() {
    if (envoi !== null) return;
    if (apercu) URL.revokeObjectURL(apercu);
    const publie = fait;
    setOuvert(false); setFichier(null); setApercu(null); setDuree(null); setLegende(""); setErreur(null); setFait(false);
    // Le statut « modèle en cours » se termine À LA FERMETURE (sinon la fenêtre disparaîtrait avant le « Bravo »).
    if (publie) onPublie?.();
  }

  function choisir(f: File | null) {
    setErreur(null); setFichier(null); setDuree(null);
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(null);
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (f.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const d = Math.round(v.duration);
        if (!d || d > DUREE_VIDEO_RESULTAT_MAX_S) { setErreur(`La vidéo doit durer ${DUREE_VIDEO_RESULTAT_MAX_S / 60} minutes au plus.`); URL.revokeObjectURL(url); return; }
        setDuree(d); setFichier(f); setApercu(url);
      };
      v.onerror = () => { setErreur("Impossible de lire cette vidéo."); URL.revokeObjectURL(url); };
      v.src = url;
      return;
    }
    const pb = verifierPhotoStory({ type: f.type, size: f.size });
    if (pb) { setErreur(pb); URL.revokeObjectURL(url); return; }
    setFichier(f); setApercu(url);
  }

  function reussi() { setEnvoi(null); setFait(true); }

  async function publier() {
    if (!fichier || envoi !== null) return;
    setErreur(null); setEnvoi(0);
    if (!fichier.type.startsWith("video/")) {
      const fd = new FormData();
      fd.append("photo", fichier);
      fd.append("legende", legende);
      const r = await publierResultatPhoto(fd);
      if (!r.ok) { setErreur(r.erreur); setEnvoi(null); return; }
      reussi();
      return;
    }
    const d = await demarrerResultatVideo();
    if (!d.ok) { setErreur(d.erreur); setEnvoi(null); return; }
    new tus.Upload(fichier, {
      endpoint: d.tus.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { AuthorizationSignature: d.tus.signature, AuthorizationExpire: String(d.tus.expire), VideoId: d.tus.videoId, LibraryId: d.tus.libraryId },
      metadata: { filetype: fichier.type, title: "Résultat" },
      onError: () => { setErreur("Échec de l'envoi de la vidéo, réessayez."); setEnvoi(null); },
      onProgress: (e, t) => setEnvoi(Math.round((e / t) * 100)),
      onSuccess: async () => {
        const f = await finaliserResultatVideo({ videoId: d.videoId, duree, legende });
        if (!f.ok) { setErreur(f.erreur); setEnvoi(null); return; }
        reussi();
      },
    }).start();
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}
        className={`mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${sombre ? "bg-white text-[#2A0880]" : "bg-gradient-to-r from-[#FE7223] to-[#5B16F9] text-white"}`}>
        <PartyPopper size={16} aria-hidden /> Mon modèle est terminé : voir mon résultat
      </button>

      {ouvert ? (
        <div role="dialog" aria-modal="true" aria-label="Publier mon résultat" className="fixed inset-0 z-[85] bg-black/70 flex items-end sm:items-center justify-center p-3" onClick={fermer}>
          <div className="w-full max-w-sm rounded-3xl bg-white text-gray-900 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <h2 className="font-semibold">🎉 Publier mon résultat</h2>
              <button type="button" onClick={fermer} aria-label="Fermer" className="ms-auto p-1 rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            {fait ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-4xl" aria-hidden>🎉</p>
                <p className="font-semibold">Bravo ! Votre résultat est publié.</p>
                <p className="text-xs text-gray-500">Pendant 24 h, une alerte « Bravo ! » le présente sur le feed ; il reste ensuite sur votre profil.</p>
                <Link href="/communaute" className="inline-block rounded-xl bg-[#5B16F9] text-white px-4 py-2 text-sm font-semibold">Voir le feed</Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">La photo (ou une vidéo de 2 minutes au plus) de votre modèle terminé. Elle sera présentée sur le feed pendant 24 h, puis gardée sur votre profil.</p>
                {apercu && fichier ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[45vh] mx-auto">
                    {fichier.type.startsWith("video/")
                      ? <video src={apercu} muted playsInline autoPlay loop className="w-full h-full object-contain" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={apercu} alt="Aperçu du résultat" className="w-full h-full object-contain" />}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1.5 hover:bg-gray-50 cursor-pointer">
                      <Camera size={24} className="text-[#5B16F9]" aria-hidden /><span className="text-sm font-semibold">Photo</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => choisir(e.target.files?.[0] ?? null)} />
                    </label>
                    <label className="rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1.5 hover:bg-gray-50 cursor-pointer">
                      <Video size={24} className="text-[#FE7223]" aria-hidden /><span className="text-sm font-semibold">Vidéo</span>
                      <input type="file" accept="video/*" className="sr-only" onChange={(e) => choisir(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                )}
                <input value={legende} onChange={(e) => setLegende(e.target.value)} maxLength={300} placeholder="Ex. : Ma robe portefeuille terminée !"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/30" />
                {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
                <div className="flex gap-2">
                  {fichier ? <button type="button" onClick={() => choisir(null)} disabled={envoi !== null} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">Changer</button> : null}
                  <button type="button" onClick={publier} disabled={!fichier || envoi !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FE7223] to-[#5B16F9] text-white px-4 py-2 text-sm font-semibold disabled:opacity-40">
                    {envoi !== null ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Envoi {envoi ? `${envoi} %` : "…"}</> : "Publier mon résultat"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
