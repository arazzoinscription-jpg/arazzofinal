"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "./actions";

/** Formulaire de création d'un groupe (nom, description, couverture optionnelle). */
export function GroupCreateForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { setErr("Le nom du groupe est requis."); return; }
    setErr("");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    const f = fileRef.current?.files?.[0];
    if (f) fd.append("cover", f);

    startTransition(async () => {
      const res = await createGroup(fd);
      if (res.ok) {
        setName(""); setDescription(""); setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 text-lg">Créer un groupe</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du groupe *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Promo Caftan 2026"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="À quoi sert ce groupe ?"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo de couverture (optionnel)</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={onCover}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-DEFAULT file:font-semibold hover:file:bg-violet-100" />
        {preview && <img src={preview} alt="" className="mt-2 w-full h-32 object-cover rounded-xl border border-cream-200" />}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <button type="submit" disabled={isPending}
        className="bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
        {isPending ? "Création…" : "Créer le groupe"}
      </button>
    </form>
  );
}
