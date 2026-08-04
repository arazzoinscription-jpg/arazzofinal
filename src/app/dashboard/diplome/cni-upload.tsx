"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Loader2, UploadCloud } from "lucide-react";
import { uploadCni } from "./actions";
import { toast } from "@/components/ui/toast";
import { WILAYAS, COMMUNES_BY_WILAYA } from "@/lib/algeria/wilayas";

/** Formulaire d'envoi de la CNI pour débloquer la génération du diplôme. */
export function CniUpload({ diplomaId }: { diplomaId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  // Wilaya et commune sont choisies dans les listes officielles : la société de
  // livraison rejette le fichier si l'orthographe ne correspond pas exactement.
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [pending, start] = useTransition();

  const communes = useMemo(() => COMMUNES_BY_WILAYA[wilaya] ?? [], [wilaya]);

  function pickWilaya(nom: string) {
    setWilaya(nom);
    setCommune(""); // la commune précédente n'appartient plus à la nouvelle wilaya
  }

  function submit() {
    if (!file) { toast("Choisissez une photo de votre CNI", "error"); return; }
    if (!phone.trim() || !address.trim()) { toast("Téléphone et adresse requis pour la livraison.", "error"); return; }
    if (!wilaya || !commune) { toast("Choisissez votre wilaya et votre commune de livraison.", "error"); return; }
    start(async () => {
      const fd = new FormData();
      fd.append("cni", file);
      fd.append("phone", phone.trim());
      fd.append("wilaya", wilaya);
      fd.append("commune", commune);
      fd.append("address", address.trim());
      const res = await uploadCni(diplomaId, fd);
      if (res.ok) { toast("CNI + adresse envoyées ✓ — votre diplôme sera généré et livré.", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  const inp = "w-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="mt-4 rounded-xl border border-cream-200 dark:border-white/10 p-4 bg-white dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90 mb-1.5">
        <IdCard size={16} className="text-violet-600" /> Envoyer ma CNI
      </div>
      <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
        Une photo de votre CNI + vos coordonnées de livraison pour générer et vous <strong>envoyer</strong> votre diplôme officiel par société de livraison.
      </p>

      {/* Coordonnées de livraison */}
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone *" dir="ltr" className={`${inp} sm:col-span-2`} />
        <select value={wilaya} onChange={(e) => pickWilaya(e.target.value)} className={inp} aria-label="Wilaya de livraison">
          <option value="">Wilaya *</option>
          {WILAYAS.map((w) => (
            <option key={w.id} value={w.nom}>{String(w.id).padStart(2, "0")} — {w.nom}</option>
          ))}
        </select>
        <select value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!wilaya} className={`${inp} disabled:opacity-50`} aria-label="Commune de livraison">
          <option value="">{wilaya ? "Commune *" : "Choisissez d'abord la wilaya"}</option>
          {communes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse exacte de livraison *" className={`${inp} sm:col-span-2`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => ref.current?.click()} disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50">
          <UploadCloud size={15} /> {file ? "Changer la photo" : "Choisir la photo"}
        </button>
        {file && <span className="text-xs text-gray-400 truncate max-w-[160px]">{file.name}</span>}
        {file && (
          <button type="button" onClick={submit} disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm bg-orange-DEFAULT text-white rounded-lg px-4 py-2 font-semibold hover:bg-orange-600 disabled:opacity-60">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} Envoyer
          </button>
        )}
      </div>
    </div>
  );
}
