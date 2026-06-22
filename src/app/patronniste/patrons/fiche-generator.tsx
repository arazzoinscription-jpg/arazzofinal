"use client";

import { useRef, useState, type RefObject } from "react";
import { Loader2, Wand2, Download, ImageDown, RefreshCw, Sparkles, Upload, Scissors } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface FicheData {
  titre: string; numero: string; tailles: string; format: string;
}

/**
 * Génère la fiche patronage (2 colonnes : dessin technique à gauche, photo réelle
 * à droite), avec dessin technique généré par IA (Gemini) depuis la photo, ou
 * remplacé manuellement par le patronniste.
 *
 * - `dessinUrl` (state) est exposé au formulaire via un input caché
 *   `dessin_technique_url` → enregistré sur le patron (route upsert).
 * - La fiche composée est capturée (html2canvas) puis placée dans l'input fichier
 *   caché `fiche` → enregistrée comme `fiche_url` et utilisable sur la page produit.
 */
export function FicheGenerator({
  formRef, initialDessinUrl, initialPhotoUrl,
}: {
  formRef: RefObject<HTMLFormElement>;
  initialDessinUrl?: string | null;
  initialPhotoUrl?: string | null;
}) {
  const ficheRef = useRef<HTMLDivElement>(null);
  const ficheFileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<FicheData | null>(null);
  const [photo, setPhoto] = useState<string | null>(initialPhotoUrl ?? null);
  const [dessinUrl, setDessinUrl] = useState<string | null>(initialDessinUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [genAI, setGenAI] = useState(false);

  function refresh() {
    const f = formRef.current;
    if (!f) return;
    const fd = new FormData(f);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    setData({
      titre: g("titre") || "Titre du patron",
      numero: g("numero"),
      tailles: g("tailles"),
      format: g("format") || "A0.A4",
    });
  }

  /** Sélection de la photo réelle → aperçu + rafraîchit la fiche. */
  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPhoto(URL.createObjectURL(f));
    refresh();
  }

  /** Génère le dessin technique via IA (Gemini) à partir de la photo importée. */
  async function generateDessin() {
    const file = photoRef.current?.files?.[0];
    if (!file) { toast("Importez d'abord la photo réelle du modèle (étape 1).", "error"); return; }
    setGenAI(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/patrons/technical-drawing", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Génération impossible");
      setDessinUrl(json.url);
      if (!data) refresh();
      toast("Dessin technique généré ✓ — vérifiez puis ajustez si besoin.", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setGenAI(false);
    }
  }

  /** Remplacement manuel du dessin technique (le patronniste téléverse le sien). */
  function onReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Aperçu local immédiat ; le fichier sera uploadé à l'enregistrement (champ `dessin`).
    setDessinUrl(URL.createObjectURL(f));
    toast("Dessin remplacé — il sera enregistré avec le patron.", "success");
  }

  async function capture(): Promise<Blob | null> {
    if (!ficheRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(ficheRef.current, { scale: 2, backgroundColor: "#FBF8F3", useCORS: true, logging: false });
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
  }

  async function download() {
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche-${(data?.titre || "patron").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast("Génération impossible", "error"); }
    finally { setBusy(false); }
  }

  /**
   * Capture la fiche composée → input fichier caché `fiche`. Côté serveur, cette
   * fiche devient le VISUEL D'APERÇU du produit (preview_url) + fiche_url.
   */
  async function useAsFiche() {
    if (!photo) { toast("Importez la photo réelle (étape 1) avant d'enregistrer la fiche.", "error"); return; }
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob || !ficheFileRef.current) return;
      const file = new File([blob], "fiche-patron.png", { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      ficheFileRef.current.files = dt.files;
      toast("Fiche enregistrée ✓ — elle deviendra le visuel d'aperçu du produit.", "success");
    } catch { toast("Action impossible", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-4">
      {/* Inputs cachés captés par le <form> parent à la soumission */}
      <input type="hidden" name="dessin_technique_url" value={dessinUrl ?? ""} readOnly />
      <input ref={ficheFileRef} type="file" name="fiche" accept="image/png" className="hidden" />
      <input ref={replaceRef} type="file" name="dessin" accept="image/*" className="hidden" onChange={onReplace} />

      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wand2 size={17} className="text-violet-600" /> Fiche patronage
        </h2>
      </div>
      <p className="text-xs text-gray-400 dark:text-white/40">
        Suivez les 3 étapes : importez la photo réelle → générez le dessin technique → enregistrez la fiche. La fiche devient automatiquement le <strong>visuel d'aperçu</strong> du produit.
      </p>

      {/* Étape 1 — photo réelle du modèle (source IA + visible sur la fiche) */}
      <div className="rounded-xl border border-cream-200 dark:border-white/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold">1</span>
          Photo réelle du modèle
        </div>
        <input ref={photoRef} name="photo_reelle" type="file" accept="image/*" onChange={onPickPhoto} className={"w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-cream-100 file:text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"} />
        <p className="text-[11px] text-gray-400 dark:text-white/40">Cette photo alimente l'IA et apparaît à droite sur la fiche. Elle sera ajoutée à la galerie du produit.</p>
      </div>

      {/* Étape 2 — dessin technique (IA ou remplacement) */}
      <div className="rounded-xl border border-cream-200 dark:border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold">2</span>
          Dessin technique
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generateDessin} disabled={genAI}
            className="inline-flex items-center gap-2 bg-violet-DEFAULT hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 transition-colors">
            {genAI ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Générer depuis la photo (IA)
          </button>
          <button type="button" onClick={() => replaceRef.current?.click()}
            className="inline-flex items-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
            <Upload size={15} /> Remplacer le dessin
          </button>
          <button type="button" onClick={refresh}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-300 hover:underline ms-auto">
            <RefreshCw size={14} /> Rafraîchir l'aperçu
          </button>
        </div>
      </div>

      {/* Aperçu (bloc capturé en image) — ratio FIXE 4:3 (760×570) pour épouser
          les cadres de la carte et de la page produit, sans marge ni déformation. */}
      <div className="overflow-x-auto">
        <div ref={ficheRef} style={{ width: 760, height: 570, display: "flex", flexDirection: "column", background: "#FBF8F3", borderRadius: 16, border: "1px solid #E2D6C8", overflow: "hidden", fontFamily: "var(--font-dm), system-ui, sans-serif" }}>
          {/* Liseré dégradé haut */}
          <div style={{ height: 6, background: "linear-gradient(90deg,#5B16F9,#7c3aed 55%,#FE7223)", flexShrink: 0 }} />

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "14px 26px 16px" }}>
            {/* Barre de marque + référence */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <img src="/images/arazzo-icon.png" alt="" crossOrigin="anonymous" style={{ width: 38, height: 38, borderRadius: 9 }} />
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 19, fontWeight: 700, color: "#FE7223" }}>Arazzo</div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: "#5B16F9", textTransform: "uppercase", marginTop: 2 }}>Patronnage</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#a89bbf", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace" }}>Référence</div>
                <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 18, fontWeight: 700, color: "#1c0659" }}>N° {data?.numero || "—"}</div>
              </div>
            </div>

            {/* Titre + filet ciseaux */}
            <div style={{ textAlign: "center", marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 22, fontWeight: 700, color: "#5B16F9", marginBottom: 4 }}>
                {data?.titre || "Titre du patron"}
              </div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9b8fb0", fontFamily: "var(--font-mono), monospace" }}>
                Patron de couture · Modèle prêt à imprimer
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
                <span style={{ height: 1, width: 96, background: "linear-gradient(90deg,transparent,#d8c4a8)" }} />
                <span style={{ color: "#FE7223", fontSize: 13 }}>✂</span>
                <span style={{ height: 1, width: 96, background: "linear-gradient(90deg,#d8c4a8,transparent)" }} />
              </div>
            </div>

            {/* 2 colonnes étiquetées — remplissent l'espace restant (flex:1) */}
            <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 0, borderRadius: 12, border: "1px solid #E8DED4", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 1px 3px rgba(28,6,89,0.06)" }}>
                  {dessinUrl
                    ? <img src={dessinUrl} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <span style={{ color: "#b9adc9", fontSize: 13, textAlign: "center", padding: 12 }}>Dessin technique<br />(IA ou import)</span>}
                </div>
                <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7c3aed", fontWeight: 600, fontFamily: "var(--font-mono), monospace", flexShrink: 0 }}>Dessin technique</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #E8DED4", background: "linear-gradient(135deg,#5B16F9,#FE7223)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(28,6,89,0.06)" }}>
                  {photo
                    ? <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontFamily: "var(--font-playfair), serif", color: "rgba(255,255,255,0.9)", fontSize: 16 }}>Photo réelle</span>}
                </div>
                <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#E5590E", fontWeight: 600, fontFamily: "var(--font-mono), monospace", flexShrink: 0 }}>Modèle réel</div>
              </div>
            </div>

            {/* Bandeau bas : tailles (FR + AR) + badges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #EADFCF", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9b8fb0", fontFamily: "var(--font-mono), monospace" }}>Tailles disponibles</div>
                  <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 16, fontWeight: 700, color: "#1c0659" }}>{data?.tailles || "—"}</div>
                </div>
                {data?.tailles && (
                  <span dir="rtl" style={{ background: "#F1EAFB", color: "#5B16F9", borderRadius: 8, padding: "4px 11px", fontSize: 13, fontWeight: 600 }}>المقاسات {data.tailles}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#fff", background: "#E5590E", borderRadius: 6, padding: "4px 10px" }}>
                  PAPIER {data?.format || "A0.A4"}
                </span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#fff", background: "#1c0659", borderRadius: 6, padding: "4px 10px" }}>
                  PDF
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Étape 3 — enregistrer la fiche (= visuel d'aperçu produit) */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold">3</span>
        Enregistrer la fiche
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={useAsFiche} disabled={busy}
          className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 transition-colors">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />} Enregistrer comme fiche produit
        </button>
        <button type="button" onClick={download} disabled={busy}
          className="inline-flex items-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
          <Download size={15} /> Télécharger la fiche
        </button>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-white/40 flex items-center gap-1.5">
        <Scissors size={12} /> Le dessin technique IA est une interprétation à plat de la photo — vérifie les détails (coutures, pinces, boutons) et remplace-le si besoin.
      </p>
    </div>
  );
}
