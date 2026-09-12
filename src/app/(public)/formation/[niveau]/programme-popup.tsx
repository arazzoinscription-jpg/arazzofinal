"use client";

import { useState } from "react";

// « Voir le programme » en POP-UP : ouvre le programme (page /formations/<slug>)
// dans une fenêtre, sans quitter la landing.
export default function ProgrammePopup({ url, label = "Voir le programme" }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#FE7223] text-[#c2510a] font-semibold hover:bg-[#FE7223]/5"
      >
        📋 {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <strong className="text-[#2A0880] font-serif">Programme détaillé</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                ✕
              </button>
            </div>
            <iframe src={url} title="Programme détaillé" className="w-full flex-1 min-h-[60vh] border-0" />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block text-center bg-gradient-to-br from-[#FE7223] to-[#f2520a] text-white font-bold py-3 hover:brightness-105"
            >
              Ouvrir le programme en grand →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
