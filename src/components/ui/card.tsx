import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
    <a href={`/formations/${slug}`} className="group block">
      <div className="rounded-2xl bg-white shadow-sm border border-cream-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative aspect-video bg-cream-200 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              ✂️
            </div>
          )}
          {niveau && (
            <span className="absolute top-3 left-3 bg-violet-DEFAULT text-white text-xs font-semibold px-3 py-1 rounded-full">
              {niveauLabel[niveau] ?? niveau}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-playfair font-semibold text-lg text-gray-900 line-clamp-2 mb-1">
            {title}
          </h3>
          {titleAr && (
            <p className="text-sm text-gray-500 text-right font-arabic mb-2">
              {titleAr}
            </p>
          )}
          {formateur && (
            <p className="text-sm text-gray-500 mb-3">par {formateur}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
            {duree && <span>⏱ {duree}</span>}
            {rating && <span>⭐ {rating.toFixed(1)}</span>}
            {studentsCount && <span>👩‍🎓 {studentsCount}</span>}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-orange-DEFAULT">
                {prixDzd.toLocaleString("fr-DZ")} DA
              </span>
              <span className="text-sm text-gray-400 ml-2">/ {prixEur}€</span>
            </div>
            <span className="text-violet-DEFAULT font-semibold text-sm group-hover:underline">
              Voir →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
