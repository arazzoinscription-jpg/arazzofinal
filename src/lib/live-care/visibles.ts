/**
 * Lives pédagogiques — quels lives une élève doit voir.
 *
 * Même règle que l'existant (`/dashboard/sessions`) — live global (sans cours) ou
 * lié à un cours qu'elle suit — complétée par :
 *  - les niveaux multiples (table `live_session_courses`) ;
 *  - l'annulation : un live annulé n'est plus proposé ;
 *  - l'audience : un direct « groupe » ou « lien secret » n'est jamais listé ici (il a sa
 *    propre page, /communaute/live ou /live/<jeton>) — sinon son lien privé fuitait.
 *
 * Module PUR.
 */

export interface LiveVisible {
  id: string;
  course_id: string | null;
  cancelled_at?: string | null;
  /** 'public' | 'group' | 'link' (migration 065). Absente = public. */
  audience?: string | null;
}

export function livesVisibles<T extends LiveVisible>(
  lives: T[],
  coursSuivis: ReadonlySet<string>,
  coursParLive: ReadonlyMap<string, string[]>,
): T[] {
  return lives.filter((l) => {
    if (l.cancelled_at) return false;
    if (l.audience && l.audience !== "public") return false;
    const lies = coursParLive.get(l.id) ?? [];
    if (lies.length) return lies.some((c) => coursSuivis.has(c));
    return !l.course_id || coursSuivis.has(l.course_id);
  });
}
