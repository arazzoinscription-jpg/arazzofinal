/**
 * Son de cloche SYNTHÉTISÉ (Web Audio) — aucun fichier à charger.
 * Une cloche = une fondamentale + des partiels inharmoniques qui s'éteignent lentement.
 *
 * Les téléphones n'autorisent le son qu'après un PREMIER geste de la personne (toucher, clic, touche).
 * `preparerSon()` « déverrouille » donc un contexte audio PARTAGÉ dès ce premier geste : quand la cloche
 * arrive ensuite (sans geste), elle peut sonner. Sur iPhone, la session audio passe en « lecture »
 * (sinon le bouton silencieux coupe la cloche).
 * `jouerCloche` renvoie false si le son reste bloqué (la bannière propose alors « Écouter la cloche »).
 */

const PARTIELS: [number, number][] = [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12], [0.5, 0.35]];

type ContexteAudio = AudioContext;
let partage: ContexteAudio | null = null;
let prepare = false;

function creerContexte(): ContexteAudio | null {
  const C = (typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined);
  return C ? new C() : null;
}

/** Le contexte partagé (créé au besoin). */
function contexte(): ContexteAudio | null {
  if (partage && partage.state !== "closed") return partage;
  partage = creerContexte();
  return partage;
}

/** iPhone (Safari 17+) : jouer même quand le bouton latéral est sur « silencieux ». */
function sessionLecture() {
  try {
    const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (s) s.type = "playback";
  } catch { /* non supporté */ }
}

/** À appeler une fois (au chargement) : au premier geste, le son est débloqué pour les cloches suivantes. */
export function preparerSon(): void {
  if (prepare || typeof window === "undefined") return;
  prepare = true;
  const evenements = ["pointerdown", "touchend", "keydown", "click"] as const;
  const debloquer = () => {
    sessionLecture();
    const ctx = contexte();
    if (!ctx) return;
    void ctx.resume().then(() => {
      if (ctx.state !== "running") return;
      // Un son muet de quelques millisecondes « ouvre » réellement la sortie audio (iPhone).
      const tampon = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = tampon;
      src.connect(ctx.destination);
      src.start(0);
      evenements.forEach((e) => window.removeEventListener(e, debloquer, true));
    }).catch(() => {});
  };
  evenements.forEach((e) => window.addEventListener(e, debloquer, { capture: true, passive: true }));
  // Revenue au premier plan : le téléphone a pu suspendre le son, on le relance.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && partage?.state === "suspended") void partage.resume().catch(() => {});
  });
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
  sessionLecture();
  const ctx = contexte();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < fois; i++) coup(ctx, t0 + i * 1.05, i % 2 === 0 ? 660 : 587, volume);
    return true;
  } catch {
    return false;
  }
}
