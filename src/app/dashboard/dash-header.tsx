/** En-tête éditorial « Atelier » réutilisable (surtitre mono N° + titre Playfair). */
export function DashHeader({
  index, eyebrow, title, subtitle,
}: {
  index: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2.5">
        <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-orange-600 dark:text-orange-400">N° {index}</span>
        <span className="h-px w-8 bg-violet-950/20 dark:bg-white/20" />
        <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-violet-950/45 dark:text-white/45">{eyebrow}</span>
      </div>
      <h1 className="font-playfair text-3xl sm:text-4xl font-bold tracking-tight text-violet-950 dark:text-white leading-[1.05]">{title}</h1>
      {subtitle && <p className="text-violet-950/55 dark:text-white/50 font-dm text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

/** Surface de carte « Atelier » (anneau hairline + ombre douce). */
export const ATELIER_CARD =
  "bg-white dark:bg-white/[0.04] ring-1 ring-violet-950/[0.07] dark:ring-white/10 shadow-[0_14px_34px_-22px_rgba(43,18,69,0.32)] dark:shadow-none";
