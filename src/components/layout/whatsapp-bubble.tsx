import { MessageCircle } from "lucide-react";

/**
 * Bulle WhatsApp flottante (espaces privés uniquement).
 * `href` est résolu côté serveur (numéro cible + message pré-rempli) : si null,
 * rien n'est rendu — la bulle n'apparaît donc jamais sans destinataire, ni sur
 * les pages publiques (elle n'est montée que dans les layouts privés).
 */
export function WhatsAppBubble({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter sur WhatsApp"
      title="Contacter sur WhatsApp"
      className="fixed z-40 bottom-24 lg:bottom-6 end-4 lg:end-6 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 hover:scale-105 hover:bg-[#1ebe5b] transition-transform"
    >
      <MessageCircle size={26} fill="currentColor" className="text-white" />
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-40 animate-ping" style={{ animationDuration: "2.5s" }} />
    </a>
  );
}
