"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [user, setUser]           = useState<{ email: string } | null>(null);
  const [lang, setLang]           = useState<"fr" | "ar">("fr");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email! });
    });
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = lang === "fr"
    ? [
        { href: "/formations",  label: "Formations" },
        { href: "/boutique",    label: "Boutique" },
        { href: "/patrons",     label: "Patrons" },
        { href: "/a-propos",    label: "À propos" },
      ]
    : [
        { href: "/formations",  label: "الدورات" },
        { href: "/boutique",    label: "المتجر" },
        { href: "/patrons",     label: "البترونات" },
        { href: "/a-propos",    label: "من نحن" },
      ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/96 backdrop-blur-md shadow-lg border-b border-cream-200" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/images/arazzo-icon.png" alt="Arazzo Formation" width={44} height={44}
              className="h-11 w-11 rounded-xl shadow-sm" />
            <span className="font-playfair font-bold text-xl leading-none whitespace-nowrap">
              <span className="text-orange-500">Arazzo</span>{" "}
              <span className={scrolled ? "text-violet-700" : "text-white"}>Formation</span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-dm font-medium transition-colors hover:text-orange-600 ${
                  scrolled ? "text-gray-700" : "text-gray-800"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* ── Right actions ── */}
          <div className="hidden md:flex items-center gap-3">
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
              className="text-sm font-semibold text-orange-600 border-2 border-orange-DEFAULT rounded-lg px-3 py-1.5 hover:bg-orange-DEFAULT hover:text-white transition-all"
            >
              {lang === "fr" ? "عربي" : "FR"}
            </button>

            {user ? (
              <Link
                href="/dashboard"
                className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm shadow-md"
              >
                {lang === "fr" ? "Mon espace" : "مساحتي"}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-orange-600 font-semibold text-sm hover:underline"
                >
                  {lang === "fr" ? "Connexion" : "دخول"}
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm shadow-md"
                >
                  {lang === "fr" ? "S'inscrire" : "تسجيل"}
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile burger ── */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}/>
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "opacity-0" : ""}`}/>
            <span className={`block w-6 h-0.5 bg-orange-DEFAULT transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}/>
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-cream-200 py-4 shadow-xl rounded-b-2xl">
            <div className="flex flex-col gap-2 px-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-700 font-medium py-2.5 border-b border-cream-100 last:border-0"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-3 mt-3 pt-3">
                <Link href="/login"    className="flex-1 text-center border-2 border-orange-DEFAULT text-orange-600 py-2.5 rounded-xl font-semibold text-sm">Connexion</Link>
                <Link href="/register" className="flex-1 text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm">S'inscrire</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
