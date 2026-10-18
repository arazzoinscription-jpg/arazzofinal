/**
 * La vidéo a-t-elle SON PROPRE SON (parole, musique) ? — décidé à la publication, dans le téléphone de la personne.
 *
 * Feed : une vidéo qui parle ou qui a sa musique garde son son (pas de musique automatique par-dessus) ; une vidéo
 * muette ou avec seulement un bruit de fond reçoit la musique automatique (comme les photos).
 * Règle : le niveau sonore est mesuré par petites tranches (≈ 45 ms) ; la vidéo « a du son » si au moins 30 % des
 * tranches dépassent −40 dBFS (un bruit de fond de téléphone est vers −55 / −45 dBFS ; la voix et la musique au-dessus).
 */

export const SEUIL_SON_DB = -40;
export const PART_SON = 0.3;
const TRAME = 2048;

/** Le niveau (dBFS) de chaque tranche d'un signal mono (−120 pour le silence complet). */
export function niveauxDb(signal: Float32Array, trame = TRAME): number[] {
  const out: number[] = [];
  for (let i = 0; i + trame <= signal.length; i += trame) {
    let somme = 0;
    for (let k = i; k < i + trame; k++) somme += signal[k] * signal[k];
    const rms = Math.sqrt(somme / trame);
    out.push(rms > 0 ? Math.max(-120, 20 * Math.log10(rms)) : -120);
  }
  return out;
}

/** Vrai si assez de tranches dépassent le seuil (parole, musique) ; faux pour un silence ou un bruit de fond. */
export function aDuSon(niveaux: readonly number[], seuil = SEUIL_SON_DB, part = PART_SON): boolean {
  if (!niveaux.length) return false;
  const fortes = niveaux.reduce((n, db) => n + (db > seuil ? 1 : 0), 0);
  return fortes / niveaux.length >= part;
}

/** Une suite d'octets ASCII dans le fichier ? (à partir de `de`, renvoie sa position ou −1). */
function chercher(octets: Uint8Array, motif: string, de = 0): number {
  const m = Array.from(motif, (c) => c.charCodeAt(0));
  const fin = octets.length - m.length;
  for (let i = de; i <= fin; i++) {
    let ok = true;
    for (let k = 0; k < m.length; k++) if (octets[i + k] !== m[k]) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}

/**
 * Le fichier contient-il une PISTE AUDIO ? MP4 / MOV : une boîte « hdlr » de type « soun » ; WebM : un codec audio
 * (A_OPUS, A_VORBIS, A_AAC…). null = autre format (on ne sait pas).
 */
export function pisteAudioPresente(octets: Uint8Array): boolean | null {
  const mp4 = chercher(octets.subarray(0, 64), "ftyp") >= 0;
  if (mp4) {
    for (let i = chercher(octets, "hdlr"); i >= 0; i = chercher(octets, "hdlr", i + 4)) {
      if (chercher(octets.subarray(i + 4, i + 16), "soun") >= 0) return true;
    }
    return false;
  }
  const webm = octets[0] === 0x1a && octets[1] === 0x45 && octets[2] === 0xdf && octets[3] === 0xa3;
  if (webm) return ["A_OPUS", "A_VORBIS", "A_AAC", "A_MPEG"].some((c) => chercher(octets, c) >= 0);
  return null;
}

/** Les pistes mélangées en une seule (moyenne). */
function mono(audio: AudioBuffer): Float32Array {
  if (audio.numberOfChannels === 1) return audio.getChannelData(0);
  const n = audio.length;
  const out = new Float32Array(n);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / audio.numberOfChannels;
  }
  return out;
}

/**
 * Dans le navigateur : écoute la piste audio d'un fichier vidéo. true = parole / musique ; false = muette ou bruit
 * de fond ; null = on ne sait pas (fichier trop lourd, format non lu, délai dépassé) → la vidéo garde son son.
 */
export async function analyserSonVideo(f: File, { maxOctets = 150 * 1024 * 1024, delaiMs = 20_000 } = {}): Promise<boolean | null> {
  if (typeof window === "undefined" || f.size > maxOctets) return null;
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const travail = (async () => {
    const ctx = new Ctx();
    let octets: ArrayBuffer | null = null;
    try {
      octets = await f.arrayBuffer();
      // Aucune piste audio du tout (vidéo exportée sans son) : muette → musique automatique.
      if (pisteAudioPresente(new Uint8Array(octets)) === false) return false;
      // Ancien Safari : decodeAudioData à rappels ; les autres : promesse.
      const donnees = octets;
      const audio = await new Promise<AudioBuffer>((ok, ko) => {
        const p = ctx.decodeAudioData(donnees, ok, ko) as unknown as Promise<AudioBuffer> | undefined;
        p?.then(ok, ko);
      });
      return aDuSon(niveauxDb(mono(audio)));
    } catch {
      return null;
    } finally {
      void ctx.close().catch(() => {});
    }
  })();
  const delai = new Promise<null>((ok) => window.setTimeout(() => ok(null), delaiMs));
  return Promise.race([travail, delai]);
}
