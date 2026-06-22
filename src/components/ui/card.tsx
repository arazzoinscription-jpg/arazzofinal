import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Clock, Star, Users, Signal, ArrowRight } from "lucide-react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm border border-cream-200 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CourseCard({
  title,
  titleAr,
  thumbnail,
  prixDzd,
  prixEur,
  formateur,
  niveau,
  duree,
  slug,
  rating,
  studentsCount,
}: {
  title: string;
  titleAr?: string;
  thumbnail?: string;
  prixDzd: number;
  prixEur: number;
  formateur?: string;
  niveau?: string;
  duree?: string;
  slug: string;
  rating?: number;
  studentsCount?: number;
}) {
  const niveauLabel: Record<string, string> = {
    debutant: "Débutant",
    intermediaire: "Intermédiaire",
    avance: "Avancé",
  };

  return (
    <a
      href={`/formations/${slug}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-DEFAULT dark:focus-visible:ring-offset-[#0d0a1c]"
    >
      <div className="rounded-2xl bg-white dark:bg-white/[0.04] ring-1 ring-violet-950/10 dark:ring-white/10 shadow-soft overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-glow group-hover:ring-orange-300/70 group-active:translate-y-0">
        <div className="relative aspect-video bg-cream-200 dark:bg-white/5 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Aperçu de la formation ${title}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cream-300 dark:text-white/20 text-5xl" aria-hidden>
              ✂
            </div>
          )}
          {/* Scrim léger pour ancrer le badge */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
          {niveau && (
            <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md shadow-md">
              <Signal size={12} strokeWidth={2.5} />
              {niveauLabel[niveau] ?? niveau}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-playfair font-bold text-lg text-violet-950 dark:text-white leading-snug line-clamp-2 mb-1">
            {title}
          </h3>
          {titleAr && (
            <p className="text-sm text-gray-500 dark:text-white/45 text-right font-arabic mb-2" dir="rtl">
              {titleAr}
            </p>
          )}
          {formateur && (
            <p className="text-sm text-violet-950/55 dark:text-white/45 mb-3">par {formateur}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-violet-950/55 dark:text-white/45 mb-4">
            {duree && <span className="inline-flex items-center gap-1.5"><Clock size={14} strokeWidth={1.75} className="text-orange-600 dark:text-orange-400" /> {duree}</span>}
            {rating != null && <span className="inline-flex items-center gap-1.5 tnum"><Star size={14} strokeWidth={1.75} className="text-orange-500 fill-orange-400" /> {rating.toFixed(1)}</span>}
            {studentsCount != null && <span className="inline-flex items-center gap-1.5 tnum"><Users size={14} strokeWidth={1.75} className="text-violet-600 dark:text-violet-300" /> {studentsCount}</span>}
          </div>
          <div className="flex items-center justify-between border-t border-cream-200 dark:border-white/10 pt-4">
            <div className="leading-none">
              <span className="text-xl font-bold text-orange-DEFAULT tnum">
                {prixDzd.toLocaleString("fr-DZ")} DA
              </span>
              <span className="text-sm text-violet-950/40 dark:text-white/35 ms-2 tnum">/ {prixEur}€</span>
            </div>
            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-300 font-semibold text-sm">
              Voir
              <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
