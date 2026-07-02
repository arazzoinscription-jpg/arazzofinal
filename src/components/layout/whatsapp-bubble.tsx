"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";

const CLS =
  "fixed z-40 bottom-24 lg:bottom-6 end-4 lg:end-6 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 hover:scale-105 hover:bg-[#1ebe5b] transition-transform";

/**
 * Bulle WhatsApp flottante (espaces privés uniquement — montée dans les layouts
 * privés, jamais sur les pages publiques).
 * - `href` présent → ouvre WhatsApp avec message pré-rempli.
 * - `href` null (numéro non configuré) → la bulle reste visible et affiche au clic
 *   un message indiquant où configurer le numéro.
 */
export function WhatsAppBubble({ href, hint }: { href: string | null; hint: string }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Contacter sur WhatsApp" title="Contacter sur WhatsApp" className={CLS}>
        <MessageCircle size={26} fill="currentColor" className="text-white" />
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-40 animate-ping" style={{ animationDuration: "2.5s" }} />
      </a>
    );
  }
  return (
    <button type="button" onClick={() => toast(hint, "info")} aria-label="Contacter sur WhatsApp" title="Contacter sur WhatsApp" className={CLS}>
      <MessageCircle size={26} fill="currentColor" className="text-white" />
    </button>
  );
}
