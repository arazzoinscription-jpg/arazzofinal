"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { Camera, Loader2, Plus, Video, X } from "lucide-react";
import { DUREE_STORY_MAX_S, verifierDureeStory, verifierPhotoStory } from "@/lib/stories/regles";
import { demarrerStoryVideo, finaliserStoryVideo, publierStoryPhoto } from "@/app/actions/stories";

/** « Ajouter une story » : une photo, ou une vidéo de 30 s au plus. Visible 24 h. */
export function AjouterStory({ variante = "bouton", sombre = false }: { variante?: "bouton" | "pastille"; sombre?: boolean }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [duree, setDuree] = useState<number | null>(null);
  const [legende, setLegende] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  function fermer() {
    if (envoi !== null) return;
    if (apercu) URL.revokeObjectURL(apercu);
    setOuvert(false); setFichier(null); setApercu(null); setDuree(null); setLegende(""); setErreur(null);
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
        const d = verifierDureeStory(v.duration);
        if (!d.ok) { setErreur(d.erreur); URL.revokeObjectURL(url); return; }
        setDuree(d.duree); setFichier(f); setApercu(url);
      };
      v.onerror = () => { setErreur("Impossible de lire cette vidéo."); URL.revokeObjectURL(url); };
      v.src = url;
      return;
    }
    const pb = verifierPhotoStory({ type: f.type, size: f.size });
    if (pb) { setErreur(pb); URL.revokeObjectURL(url); return; }
    setFichier(f); setApercu(url);
  }

  async function publier() {
    if (!fichier || envoi !== null) return;
    setErreur(null); setEnvoi(0);
    if (!fichier.type.startsWith("video/")) {
      const fd = new FormData();
      fd.append("photo", fichier);
      fd.append("legende", legende);
      const r = await publierStoryPhoto(fd);
      setEnvoi(null);
      if (!r.ok) { setErreur(r.erreur); return; }
      fermer(); router.refresh();
      return;
    }
    const d = await demarrerStoryVideo();
    if (!d.ok) { setErreur(d.erreur); setEnvoi(null); return; }
    const up = new tus.Upload(fichier, {
      endpoint: d.tus.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { AuthorizationSignature: d.tus.signature, AuthorizationExpire: String(d.tus.expire), VideoId: d.tus.videoId, LibraryId: d.tus.libraryId },
      metadata: { filetype: fichier.type, title: "Story" },
      onError: () => { setErreur("Échec de l'envoi de la vidéo, réessayez."); setEnvoi(null); },
      onProgress: (envoye, total) => setEnvoi(Math.round((envoye / total) * 100)),
      onSuccess: async () => {
        const f = await finaliserStoryVideo({ videoId: d.videoId, duree, legende });
        setEnvoi(null);
        if (!f.ok) { setErreur(f.erreur); return; }
        fermer(); router.refresh();
      },
    });
    up.start();
  }

  return (
    <>
      {variante === "pastille" ? (
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ajouter une story"
          className="absolute -bottom-0.5 -end-0.5 w-6 h-6 rounded-full bg-[#5B16F9] text-white ring-2 ring-white flex items-center justify-center"><Plus size={14} /></button>
      ) : (
        <button type="button" onClick={() => setOuvert(true)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${sombre ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#5B16F9]/10 text-[#5B16F9] hover:bg-[#5B16F9]/15"}`}>
          <Plus size={14} aria-hidden /> Ajouter une story
        </button>
      )}

      {ouvert ? (
        <div role="dialog" aria-modal="true" aria-label="Ajouter une story" className="fixed inset-0 z-[85] bg-black/70 flex items-end sm:items-center justify-center p-3" onClick={fermer}>
          <div className="w-full max-w-sm rounded-3xl bg-white text-gray-900 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <h2 className="font-semibold">Ajouter une story</h2>
              <button type="button" onClick={fermer} aria-label="Fermer" className="ms-auto p-1 rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500">Une photo, ou une vidéo de {DUREE_STORY_MAX_S} secondes au plus. Visible 24 h par les membres de la communauté.</p>
            <input ref={champ} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => choisir(e.target.files?.[0] ?? null)} />
            {apercu && fichier ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[50vh] mx-auto">
                {fichier.type.startsWith("video/")
                  ? <video src={apercu} muted playsInline autoPlay loop className="w-full h-full object-contain" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={apercu} alt="Aperçu de la story" className="w-full h-full object-contain" />}
                {duree ? <span className="absolute top-2 end-2 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5">{duree} s</span> : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { if (champ.current) { champ.current.accept = "image/*"; champ.current.click(); } }} className="rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1.5 hover:bg-gray-50">
                  <Camera size={24} className="text-[#5B16F9]" aria-hidden /><span className="text-sm font-semibold">Photo</span>
                </button>
                <button type="button" onClick={() => { if (champ.current) { champ.current.accept = "video/*"; champ.current.click(); } }} className="rounded-2xl border border-gray-200 p-4 flex flex-col items-center gap-1.5 hover:bg-gray-50">
                  <Video size={24} className="text-[#FE7223]" aria-hidden /><span className="text-sm font-semibold">Vidéo 30 s</span>
                </button>
              </div>
            )}
            <input value={legende} onChange={(e) => setLegende(e.target.value)} maxLength={150} placeholder="Une légende (facultatif)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/30" />
            {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
            <div className="flex gap-2">
              {fichier ? <button type="button" onClick={() => choisir(null)} disabled={envoi !== null} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">Changer</button> : null}
              <button type="button" onClick={publier} disabled={!fichier || envoi !== null}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white px-4 py-2 text-sm font-semibold disabled:opacity-40">
                {envoi !== null ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Envoi {envoi ? `${envoi} %` : "…"}</> : "Publier la story"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
