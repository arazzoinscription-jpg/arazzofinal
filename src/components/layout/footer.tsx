"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const columns = [
  {
    title: "Plateforme",
    links: [
      { href: "/formations", label: "Formations" },
      { href: "/patrons", label: "Patrons" },
      { href: "/devenir-formateur", label: "Devenir formateur" },
      { href: "/tarifs", label: "Tarifs" },
    ],
  },
  {
    title: "Aide",
    links: [
      { href: "/aide", label: "Centre d'aide" },
      { href: "/contact", label: "Contact" },
      { href: "/a-propos", label: "À propos" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/cgu", label: "CGU" },
      { href: "/cgv", label: "CGV" },
      { href: "/confidentialite", label: "Politique de confidentialité" },
    ],
  },
];

const socials = [
  { label: "Telegram", icon: "✈" },
  { label: "WhatsApp", icon: "💬" },
  { label: "YouTube", icon: "▶" },
  { label: "TikTok", icon: "♪" },
  { label: "Instagram", icon: "📷" },
  { label: "Facebook", icon: "f" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <motion.span initial="rest" animate="rest" whileHover="hover" className="relative inline-block">
      <Link href={href} className="text-gray-400 hover:text-orange-DEFAULT transition-colors font-dm text-sm">
        {label}
      </Link>
      <motion.span
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute left-0 -bottom-0.5 h-px w-full bg-orange-DEFAULT origin-left"
      />
    </motion.span>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#1a1428] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="col-span-2">
            <div className="bg-white/95 rounded-2xl inline-block px-4 py-3 mb-5">
              <Image src="/images/logo-arazzo.svg" alt="Arazzo Formation" width={150} height={50} className="h-11 w-auto" />
            </div>
            <p className="text-gray-400 leading-relaxed max-w-xs font-dm mb-6">
              L'académie en ligne du Maghreb pour la couture, le modélisme et le
              patronage. Le fil de votre talent, du modèle au métier.
            </p>
            {/* Socials */}
            <div className="flex gap-3">
              {socials.map((s) => (
                <motion.a
                  key={s.label} href="#" aria-label={s.label}
                  whileHover={{ scale: 1.2, color: "#E8650A" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm"
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-white mb-4 font-dm">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}><FooterLink href={l.href} label={l.label} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cities */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-gray-400 font-dm text-sm">
          <span className="flex items-center gap-1.5">🇩🇿 Alger</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1.5">🇲🇦 Casablanca</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1.5">🇹🇳 Tunis</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1.5">🇫🇷 Paris</span>
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center text-gray-500 text-sm font-dm">
          © 2026 Arazzo Formation · <span className="text-violet-300">arazzo.formation</span>
        </div>
      </div>
    </footer>
  );
}
