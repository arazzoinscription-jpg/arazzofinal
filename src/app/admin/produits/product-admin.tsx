"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, toggleProductActive, deleteProduct } from "./actions";
import { toast } from "@/components/ui/toast";

const TYPES = [
  { value: "course", label: "Formation" },
  { value: "digital_file", label: "Fichier numérique" },
  { value: "patron_pdf", label: "Patron PDF" },
  { value: "bundle", label: "Pack" },
];

/** Formulaire de création d'un produit. */
export function ProductCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "", description: "", type: "digital_file",
    price: "", compare_price: "", image: "", stock: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProduct({
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type as "course" | "digital_file" | "patron_pdf" | "bundle",
        price: Number(form.price) || 0,
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        image: form.image.trim() || null,
        stock: form.stock ? Number(form.stock) : null,
        course_id: null,
      });
      if (res.ok) {
        toast("Produit créé", "success");
        setForm({ title: "", description: "", type: "digital_file", price: "", compare_price: "", image: "", stock: "" });
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Nouveau produit</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} required
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
        <select value={form.type} onChange={(e) => set("type", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix (DA) *</label>
          <input type="number" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix barré</label>
          <input type="number" min={0} value={form.compare_price} onChange={(e) => set("compare_price", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock (vide = illimité)</label>
        <input type="number" min={0} value={form.stock} onChange={(e) => set("stock", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">URL image</label>
        <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <button type="submit" disabled={isPending}
        className="w-full bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
        {isPending ? "Création…" : "Créer le produit"}
      </button>
    </form>
  );
}

/** Ligne produit avec activation/suppression. */
export function ProductRow({ product }: { product: { id: string; title: string; type: string; price: number; stock: number | null; is_active: boolean } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleProductActive(product.id, !product.is_active);
      if (res.ok) router.refresh(); else toast(res.error ?? "Erreur", "error");
    });
  }
  function remove() {
    if (!confirm("Supprimer ce produit ?")) return;
    startTransition(async () => {
      const res = await deleteProduct(product.id);
      if (res.ok) { toast("Produit supprimé", "info"); router.refresh(); } else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 font-dm truncate">{product.title}</p>
        <p className="text-xs text-gray-400 font-dm">
          {Number(product.price).toLocaleString("fr-DZ")} DA · stock {product.stock ?? "∞"}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={toggle} disabled={isPending}
          className={`text-xs font-semibold px-3 py-1 rounded-full ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {product.is_active ? "Actif" : "Inactif"}
        </button>
        <button onClick={remove} disabled={isPending} className="text-red-400 hover:text-red-600 text-sm font-semibold">Suppr.</button>
      </div>
    </div>
  );
}
