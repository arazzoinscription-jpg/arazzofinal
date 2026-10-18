import Link from "next/link";
import { Users, MapPin, Globe2, ArrowUpRight, PlayCircle, School } from "lucide-react";
import { Globe } from "@/components/ui/globe";

const STATS = [
  { Icon: Users, value: "+12 000", label: "couturières" },
  { Icon: Globe2, value: "5", label: "pays" },
  { Icon: MapPin, value: "18", label: "villes" },
];

/**
 * Panneau hero « Communauté » du tableau de bord — globe 3D interactif
 * (inspiré du template v0), aux couleurs Arazzo.
 * Réutilisable (élève / patronniste) via `href`, `cta`, `eyebrow`. `classe` / `cours` : deux boutons de plus à côté
 * de « Entrer dans La Cour » (espace élève : entrer en classe, voir son cours).
 */
export function CommunityGlobe({
  prenom,
  href = "/dashboard/actualites",
  cta = "Entrer dans La Cour",
  eyebrow = "N° 00",
  classe,
  cours,
}: {
  prenom: string;
  href?: string;
  cta?: string;
  eyebrow?: string;
  classe?: { href: string; label: string };
  cours?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b0c3c] via-violet-900 to-[#2a1245] ring-1 ring-white/10 shadow-[0_34px_80px_-34px_rgba(43,18,69,0.8)] mb-6">
      {/* Grain */}
      <div aria-hidden className="absolute inset-0 opacity-[0.06] mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      {/* Halo orange derrière le globe */}
      <div aria-hidden className="absolute top-1/2 end-[12%] -translate-y-1/2 w-[26rem] h-[26rem] rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
      {/* Repères de cadrage */}
      <span aria-hidden className="absolute top-4 start-4 w-4 h-4 border-t-2 border-s-2 border-white/20" />
      <span aria-hidden className="absolute bottom-4 end-4 w-4 h-4 border-b-2 border-e-2 border-white/20" />

      <div className="relative grid lg:grid-cols-2 items-center gap-6 p-7 sm:p-10">
        {/* Texte */}
        <div className="order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-300">{eyebrow}</span>
            <span className="h-px w-9 bg-white/25" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/55">La Cour</span>
          </div>

          <h2 className="font-playfair text-3xl sm:text-[2.6rem] font-bold text-white leading-[1.06] tracking-tight">
            {prenom ? `${prenom}, vous` : "Vous"} cousez avec tout
            <span className="block italic text-orange-300">le Maghreb &amp; sa diaspora.</span>
          </h2>
          <p className="text-violet-200/80 font-dm mt-4 max-w-md leading-relaxed">
            Des milliers de couturières apprennent, partagent et créent ensemble — d'Alger à Casablanca, de Tunis à Paris et Montréal.
          </p>

          {/* Crédits chiffrés */}
          <div className="flex flex-wrap gap-y-4 mt-7">
            {STATS.map((s, i) => (
              <div key={s.label} className={`px-5 first:ps-0 ${i > 0 ? "border-s border-white/15" : ""}`}>
                <div className="flex items-center gap-2 text-white">
                  <s.Icon size={16} className="text-orange-300" />
                  <span className="font-playfair text-2xl font-bold leading-none tabular-nums">{s.value}</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/45 mt-2">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 mt-8">
            <Link href={href}
              className="group inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold font-dm transition-colors shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
              {cta}
              <ArrowUpRight size={17} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
            </Link>
            {classe ? (
              <Link href={classe.href}
                className="inline-flex items-center gap-2 bg-white text-violet-900 hover:bg-violet-50 px-5 py-3 rounded-xl font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                <School size={18} aria-hidden /> {classe.label}
              </Link>
            ) : null}
            {cours ? (
              <Link href={cours.href}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/30 px-5 py-3 rounded-xl font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                <PlayCircle size={18} aria-hidden /> {cours.label}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Globe */}
        <div className="order-1 lg:order-2 relative">
          <Globe className="mx-auto max-w-[300px] sm:max-w-[380px] lg:max-w-[440px]" />
        </div>
      </div>
    </section>
  );
}
