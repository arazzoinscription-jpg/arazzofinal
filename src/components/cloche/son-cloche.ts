/**
 * Son de cloche SYNTHÉTISÉ (Web Audio) — aucun fichier à charger.
 * Une cloche = une fondamentale + des partiels inharmoniques qui s'éteignent lentement.
 * Renvoie false si le navigateur refuse de jouer un son sans geste préalable de l'élève.
 */

const PARTIELS: [number, number][] = [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12], [0.5, 0.35]];

type ContexteAudio = AudioContext;

function contexte(): ContexteAudio | null {
  const C = (typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined);
  return C ? new C() : null;
}

function coup(ctx: ContexteAudio, debut: number, base: number, volume: number) {
  const sortie = ctx.createGain();
  sortie.gain.value = volume;
  sortie.connect(ctx.destination);
  for (const [ratio, amp] of PARTIELS) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * ratio;
    const duree = 2.6 / Math.sqrt(ratio);
    g.gain.setValueAtTime(0.0001, debut);
    g.gain.exponentialRampToValueAtTime(amp, debut + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    osc.connect(g).connect(sortie);
    osc.start(debut);
    osc.stop(debut + duree + 0.05);
  }
}

/** Fait sonner la cloche `fois` fois (≈ 1 s entre deux coups). */
export async function jouerCloche(fois = 3, volume = 0.35): Promise<boolean> {
  const ctx = contexte();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") { void ctx.close(); return false; }
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < fois; i++) coup(ctx, t0 + i * 1.05, i % 2 === 0 ? 660 : 587, volume);
    window.setTimeout(() => { void ctx.close(); }, (fois * 1.05 + 3) * 1000);
    return true;
  } catch {
    void ctx.close();
    return false;
  }
}
