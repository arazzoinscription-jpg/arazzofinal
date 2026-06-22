"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform, type Variants } from "framer-motion";
import { ShieldCheck, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { HOME, type Lang } from "@/lib/home-i18n";
import { LangSwitcherPublic } from "./lang-switcher-public";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CartIcon } from "./cart-icon";

const MotionLink = motion.create(Link);

// `solid` par défaut = barre toujours opaque et lisible (évite la barre
// transparente/invisible sur les pages à fond clair). Une page avec héro sombre
// peut opter pour l'effet transparent-au-scroll via `solid={false}`.
export function Navbar({ lang = "fr", solid = true }: { lang?: Lang; solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const reduce = useReducedMotionSafe();
  const pathname = usePathname();

  const t = HOME[lang].nav;

  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.95)"]);
  const navShadow = useTransform(scrollY, [0, 80], ["0 0 0 rgba(0,0,0,0)", "0 2px 20px rgba(107,33,200,0.10)"]);

  // `solid` (ex. pages au fond clair) : barre toujours opaque et lisible.
  const onLight = solid || scrolled;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser({ email: data.user.email! });
      const { data: prof } = await supabase.from("users").select("role").eq("id", data.user.id).single();
      setIsAdmin(prof?.role === "admin");
    });
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme le menu mobile à chaque navigation.
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const links = [
    { href: "/formations", label: t.formations },
    { href: "/patrons", label: t.patrons },
    { href: "/boutique", label: t.boutique },
    { href: "/offre", label: t.offre },
    { href: "/a-propos", label: t.apropos },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // ── Orchestration d'entrée ──
  // NB : on n'anime PAS l'opacité/position de la <nav> elle-même — sinon, tant que
  // le JS n'a pas hydraté, la barre reste à opacity:0 (invisible → « transparente »).
  // La barre est donc toujours visible ; seuls les enfants ont une légère cascade.
  const row: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: 0.05 } } };
  const itemV: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: -10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

  // ── Menu mobile ──
  const panelV: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: -12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1], staggerChildren: reduce ? 0 : 0.05, delayChildren: 0.05 } },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -12, transition: { duration: 0.18 } },
  };
  const mLink: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } };

  return (
    <motion.nav
      style={solid ? { boxShadow: "0 4px 24px rgba(107,33,200,0.12)" } : { backgroundColor: navBg, boxShadow: navShadow }}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        solid
          ? "bg-white dark:bg-[#15102b] border-b border-cream-200 dark:border-white/10"
          : onLight
            ? "border-b border-cream-200"
            : "border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={row} initial="hidden" animate="show" className="flex items-center justify-between h-20">
          {/* ── Logo ── */}
          <motion.div variants={itemV}>
            <MotionLink href="/" whileHover="hover" initial="rest" animate="rest" className="group flex items-center gap-3">
              <motion.span
                variants={{ rest: { rotate: 0 }, hover: reduce ? {} : { rotate: -8, scale: 1.06 } }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="relative grid place-items-center"
              >
                <img src="/images/arazzo-icon.png" alt="Arazzo Formation" width={44} height={44} className="h-11 w-11 rounded-xl shadow-sm" />
                <span className="absolute -bottom-1 -end-1 w-5 h-5 rounded-md bg-white dark:bg-[#15102b] ring-1 ring-violet-950/10 grid place-items-center">
                  <Scissors size={11} className="text-orange-600 -rotate-12" />
                </span>
              </motion.span>
              <span className="leading-none whitespace-nowrap">
                <span className="block font-mono text-[9px] tracking-[0.32em] uppercase text-orange-600/80">N° 01 · Atelier</span>
                <span className="block font-playfair font-bold text-xl mt-0.5">
                  <span className="text-orange-500">Arazzo</span>{" "}
                  <span className={onLight ? "text-violet-800 dark:text-white" : "text-white drop-shadow"}>Formation</span>
                </span>
              </span>
            </MotionLink>
          </motion.div>

          {/* ── Nav desktop ── */}
          <div className="hidden md:flex items-center gap-7 lg:gap-9">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <motion.div key={l.href} variants={itemV}>
                  <motion.div initial="rest" animate="rest" whileHover="hover" className="relative">
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={`font-dm font-medium text-[15px] transition-colors ${
                        active ? "text-orange-600" : onLight ? "text-violet-950/80 dark:text-white/85 hover:text-orange-600 dark:hover:text-orange-300" : "text-white/90 drop-shadow hover:text-orange-300"
                      }`}
                    >
                      {l.label}
                    </Link>
                    <motion.span
                      variants={{ rest: { scaleX: active ? 1 : 0 }, hover: { scaleX: 1 } }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 -bottom-2 h-0.5 w-full bg-orange-DEFAULT origin-left rounded-full"
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Actions desktop ── */}
          <motion.div variants={itemV} className="hidden md:flex items-center gap-3">
            <CartIcon scrolled={onLight} />
            <LangSwitcherPublic current={lang} scrolled={onLight} />
            <ThemeToggle />
            {user ? (
              <>
                {isAdmin && (
                  <MotionLink href="/admin" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
                    className="shiny-cta inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-700 to-violet-DEFAULT text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md ring-1 ring-white/20">
                    <ShieldCheck size={16} /> {t.admin}
                  </MotionLink>
                )}
                <MotionLink href="/dashboard" whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
                  className="bg-orange-DEFAULT hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors">
                  {t.space}
                </MotionLink>
              </>
            ) : (
              <>
                <Link href="/login" className={`font-semibold text-sm hover:underline ${onLight ? "text-orange-600" : "text-white drop-shadow"}`}>
                  {t.login}
                </Link>
                <MotionLink href="/rejoindre" whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
                  className="bg-orange-DEFAULT hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors">
                  {t.register}
                </MotionLink>
              </>
            )}
          </motion.div>

          {/* ── Mobile : panier + burger ── */}
          <motion.div variants={itemV} className="md:hidden flex items-center gap-3">
            <CartIcon scrolled={onLight} />
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}
              className="relative flex flex-col items-center justify-center gap-1.5 w-10 h-10 rounded-xl">
              <motion.span animate={menuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }}
                className="block w-6 h-0.5 bg-orange-DEFAULT rounded-full" />
              <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.2 }}
                className="block w-6 h-0.5 bg-orange-DEFAULT rounded-full" />
              <motion.span animate={menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }}
                className="block w-6 h-0.5 bg-orange-DEFAULT rounded-full" />
            </button>
          </motion.div>
        </motion.div>

        {/* ── Menu mobile (overlay animé) ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              variants={panelV}
              initial="hidden"
              animate="show"
              exit="exit"
              className="md:hidden absolute top-full inset-x-0 mx-3 mt-2 origin-top rounded-2xl bg-white/95 dark:bg-[#15102b]/95 backdrop-blur-xl border border-cream-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col p-3">
                {links.map((l, i) => (
                  <motion.div key={l.href} variants={mLink}>
                    <Link href={l.href} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl font-dm font-medium transition-colors ${
                        isActive(l.href) ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300" : "text-violet-950/80 dark:text-white/80 hover:bg-cream-50 dark:hover:bg-white/5"
                      }`}>
                      <span className="font-mono text-[10px] tracking-widest text-violet-950/35 dark:text-white/35">{String(i).padStart(2, "0")}</span>
                      {l.label}
                    </Link>
                  </motion.div>
                ))}

                <motion.div variants={mLink} className="flex items-center gap-2 px-3 py-2 mt-1">
                  <LangSwitcherPublic current={lang} scrolled />
                  <ThemeToggle />
                </motion.div>

                {isAdmin && (
                  <motion.div variants={mLink}>
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-700 to-violet-DEFAULT text-white py-3 rounded-xl font-semibold text-sm mt-1">
                      <ShieldCheck size={16} /> {t.admin}
                    </Link>
                  </motion.div>
                )}
                {user ? (
                  <motion.div variants={mLink}>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                      className="block text-center bg-orange-DEFAULT hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm mt-1 transition-colors">
                      {t.space}
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div variants={mLink} className="flex gap-3 mt-1">
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center border-2 border-orange-DEFAULT text-orange-600 py-2.5 rounded-xl font-semibold text-sm">{t.login}</Link>
                    <Link href="/rejoindre" onClick={() => setMenuOpen(false)} className="flex-1 text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm">{t.register}</Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
