"use client";

import { useEffect, useState } from "react";

// Système de toast minimal et découplé : `toast()` émet un évènement,
// le <Toaster/> (monté dans les layouts) l'affiche. Aucune dépendance externe.

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

const EVENT = "app:toast";

/** Affiche un toast depuis n'importe quel composant client. */
export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ message: string; type: ToastType }>(EVENT, { detail: { message, type } }));
}

const STYLES: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-orange-DEFAULT text-white",
};
const ICONS: Record<ToastType, string> = { success: "✓", error: "✕", info: "ℹ" };

/** Conteneur d'affichage des toasts (à monter une fois par layout). */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, message: detail.message, type: detail.type }]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-dm text-sm animate-question-in ${STYLES[t.type]}`}>
          <span className="font-bold">{ICONS[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
