"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, FileUp, Images, Video, Lightbulb } from "lucide-react";
import { FicheGenerator } from "./fiche-generator";

export interface PatronInit {
  id?: string;
  titre?: string;
  description?: string | null;
  prix_dzd?: number | null;
  prix_eur?: number | null;
  tailles?: string | null;
  tissu?: string | null;
  taille_table?: string | null;
  nb_pages?: number | null;
  format?: string | null;
  preview_url?: string | null;
  fichier_url?: string | null;
  video_url?: string | null;
  conseils?: string | null;
  course_id?: string | null;
  images?: string[] | null;
  numero?: string | null;
  dessin_technique_url?: string | null;
}

export interface CourseOption { id: string; titre_fr: string | null }

const field = "w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const label = "block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5";

export function PatronForm({ init = {}, courses = [], nextNumero }: { init?: PatronInit; courses?: CourseOption[]; nextNumero?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (init.id) fd.set("id", init.id);
    try {
      const res = await fetch("/api/patrons/upsert", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      router.push("/patronniste/patrons");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Informations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>Titre du patron *</label>
            <input name="titre" defaultValue={init.titre ?? ""} required className={field} placeholder="Ex. Jupe portefeuille" />
          </div>
          <div>
            <label className={label}>N° de modèle</label>
            <input name="numero" defaultValue={init.numero ?? nextNumero ?? ""} className={field} placeholder="Ex. 1001" />
            {!init.id && nextNumero && <p className="text-[11px] text-gray-400 dark:text-white/40 mt-1">Auto · modifiable</p>}
          </div>
        </div>
        <div>
          <label className={label}>Description</label>
          <textarea name="description" defaultValue={init.description ?? ""} rows={3} className={field} placeholder="Pièces incluses, niveau, notice de montage…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Prix (DA)</label>
            <input name="prix_dzd" type="number" min="0" defaultValue={init.prix_dzd ?? 0} className={field} />
          </div>
          <div>
            <label className={label}>Prix (€)</label>
            <input name="prix_eur" type="number" min="0" step="0.01" defaultValue={init.prix_eur ?? 0} className={field} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Attributs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Tailles disponibles</label>
            <input name="tailles" defaultValue={init.tailles ?? ""} className={field} placeholder="Ex. 34 – 52" />
          </div>
          <div>
            <label className={label}>Tissus à utiliser</label>
            <input name="tissu" defaultValue={init.tissu ?? ""} className={field} placeholder="Ex. Crêpe · satin · gabardine" />
          </div>
          <div>
            <label className={label}>Nombre de pages</label>
            <input name="nb_pages" type="number" min="0" defaultValue={init.nb_pages ?? ""} className={field} placeholder="24" />
          </div>
          <div>
            <label className={label}>Format d'impression</label>
            <input name="format" defaultValue={init.format ?? "PDF A4 + A0"} className={field} placeholder="PDF A4 + A0" />
          </div>
        </div>
        <div>
          <label className={label}>Table des mesures (placement)</label>
          <textarea name="taille_table" defaultValue={init.taille_table ?? ""} rows={3} className={field}
            placeholder="Décrivez la table des mesures : tour de poitrine, tour de taille, tour de hanches, hauteur… et indications de placement sur le tissu." />
        </div>
      </div>

      {/* L'outil de fiche patronage : photo réelle → dessin IA → fiche (= visuel produit) */}
      <FicheGenerator formRef={formRef} initialDessinUrl={init.dessin_technique_url} initialPhotoUrl={init.images?.[0] ?? null} />

      <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Fichiers & vente</h2>
        <div>
          <label className={label}><FileUp size={15} className="inline -mt-0.5 me-1" /> Fichier du patron (PDF)</label>
          <input name="pdf" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className={field} />
          {init.fichier_url && (
            <a href={init.fichier_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-violet-600 dark:text-violet-300 underline">
              Fichier actuel
            </a>
          )}
        </div>
        <div>
          <label className={label}><Images size={15} className="inline -mt-0.5 me-1" /> Photos supplémentaires (optionnel)</label>
          <input name="gallery" type="file" accept="image/*" multiple className={field} />
          {init.images && init.images.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {init.images.map((src, i) => (
                <img key={i} src={src} alt="" className="w-16 h-20 object-cover rounded-lg border border-cream-200 dark:border-white/10" />
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={label}><Video size={15} className="inline -mt-0.5 me-1" /> Vidéo démonstrative (URL YouTube / Vimeo / MP4)</label>
          <input name="video_url" defaultValue={init.video_url ?? ""} className={field} placeholder="https://youtu.be/…" />
        </div>
        <div>
          <label className={label}><Lightbulb size={15} className="inline -mt-0.5 me-1" /> Conseils de couture (comment traiter le patron)</label>
          <textarea name="conseils" defaultValue={init.conseils ?? ""} rows={4} className={field}
            placeholder="Type de tissu conseillé, sens du droit-fil, entoilage, ordre de montage, finitions recommandées…" />
        </div>
        <div>
          <label className={label}>Formation de référence (pour apprendre à coudre ce modèle)</label>
          <select name="course_id" defaultValue={init.course_id ?? ""} className={field}>
            <option value="">— Aucune —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.titre_fr ?? "Formation"}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {init.id ? "Enregistrer les modifications" : "Créer le patron"}
      </button>
    </form>
  );
}
