"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { CommunityPerson } from "@/app/actions/community";

interface Props {
  open: boolean;
  title: string;
  loading: boolean;
  people: CommunityPerson[];
  emptyLabel: string;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Arazzo", formateur: "Formatrice", patronniste: "Patronniste", eleve: "Membre",
};

/** Modale listant des membres (abonnés / abonnements / personnes ayant aimé). */
export function PeopleModal({ open, title, loading, people, emptyLabel, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#15102b] rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} aria-label="Fermer"
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-cream-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/60">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2 pb-[max(12px,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="py-12 text-center text-gray-400 dark:text-white/40 text-sm font-dm">Chargement…</div>
          ) : people.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-white/40 text-sm font-dm">{emptyLabel}</div>
          ) : (
            people.map((p) => {
              const initial = (p.nom?.trim()[0] ?? "?").toUpperCase();
              return (
                <Link
                  key={p.id}
                  href={`/communaute/u/${p.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-cream-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="w-11 h-11 rounded-full overflow-hidden bg-orange-DEFAULT grid place-items-center text-white font-bold shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} alt={p.nom ?? ""} className="w-full h-full object-cover" /> : initial}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900 dark:text-white truncate">{p.nom ?? "Membre"}</span>
                    <span className="block text-xs text-gray-400 dark:text-white/40 truncate">
                      {p.username ? `@${p.username}` : (ROLE_LABEL[p.role ?? "eleve"] ?? "Membre")}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
