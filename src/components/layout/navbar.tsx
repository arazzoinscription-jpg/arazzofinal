"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { HOME, type Lang } from "@/lib/home-i18n";
import { LangSwitcherPublic } from "./lang-switcher-public";

const MotionLink = motion.create(Link);

export function Navbar({ lang = "fr" }: { lang?: Lang }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  const t = HOME[lang].nav;

  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.95)"]);
  const navShadow = useTransform(scrollY, [0, 80], ["0 0 0 rgba(0,0,0,0)", "0 2px 20px rgba(107,33,200,0.10)"]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email! });
    });
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/formations", label: t.formations },
    { href: "/boutique", label: t.boutique },
    { href: "/patrons", label: t.patrons },
    { href: "/offre", label: t.offre },
    { href: "/a-propos", label: t.apropos },
  ];

  return (
    <motion.nav
      style={{ backgroundColor: navBg, boxShadow: navShadow }}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        scrolled ? "border-b border-cream-200" : "border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <MotionLink href="/" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }} className="flex items-center gap-2.5">
            <img src="/images/arazzo-icon.png" alt="Arazzo Formation" width={44} height={44} className="h-11 w-11 rounded-xl shadow-sm" />
            <span className="font-playfair font-bold text-xl leading-none whitespace-nowrap">
              <span className="text-orange-500">Arazzo</span>{" "}
              <span className={scrolled ? "text-violet-700" : "text-white drop-shadow"}>Formation</span>
            </span>
          </MotionLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <motion.div key={l.href} initial="rest" animate="rest" whileHover="hover" className="relative">
                <Link href={l.href} className={`font-dm font-medium transition-colors hover:text-orange-600 ${scrolled ? "text-gray-700" : "text-white drop-shadow"}`}>
                  {l.label}
                </Link>
                <motion.span variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute left-0 -bottom-1.5 h-0.5 w-full bg-orange-DEFAULT origin-left rounded-full" />
              </motion.div>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <LangSwitcherPublic current={lang} scrolled={scrolled} />
            {user ? (
              <MotionLink href="/dashboard" whileHover={{ scale: 1.04, backgroundColor: "#E8650A" }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
                className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md">
                {t.space}
              </MotionLink>
            ) : (
              <>
                <Link href="/login" className={`font-semibold text-sm hover:underline ${scrolled ? "text-orange-600" : "text-white drop-shadow"}`}>
                  {t.login}
                </Link>
                <MotionLink href="/register" whileHover={{ scale: 1.04, backgroundColor: "#E8650A" }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
                  className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md">
                  {t.register}
                </MotionLink>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-cream-200 py-4 shadow-xl rounded-b-2xl">
            <div className="flex flex-col gap-2 px-4">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium py-2.5 border-b border-cream-100 last:border-0">
                  {l.label}
                </Link>
              ))}
              <div className="py-2"><LangSwitcherPublic current={lang} scrolled /></div>
              <div className="flex gap-3 mt-1 pt-1">
                <Link href="/login" className="flex-1 text-center border-2 border-orange-DEFAULT text-orange-600 py-2.5 rounded-xl font-semibold text-sm">{t.login}</Link>
                <Link href="/register" className="flex-1 text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm">{t.register}</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
