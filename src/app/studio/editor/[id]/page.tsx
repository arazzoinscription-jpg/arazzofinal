"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Play, SlidersHorizontal, Sparkles, ExternalLink } from "lucide-react";
import {
  StudioAPI, sourceUrl, downloadUrl, editorUrl,
  type ReelFull, type Segment, type ExportStatus, type ExportOpts,
} from "@/lib/studio-api";

const FORMATS = [
  { v: "reel", l: "📱 Reel / Insta · 9:16" },
  { v: "tiktok", l: "🎵 TikTok · 9:16" },
  { v: "short", l: "▶️ YouTube Short · 9:16" },
  { v: "story", l: "⭕ Story · 9:16" },
  { v: "carre", l: "⬛ Carré · 1:1" },
  { v: "youtube", l: "🖥️ YouTube · 16:9" },
  { v: "cours", l: "🎓 Cours complet · 16:9" },
];

const BD_ROWS: [string, string][] = [
  ["pedagogy", "Pédagogie"], ["sewing", "Couture"], ["language", "Langue"],
  ["voice", "Voix"], ["audio", "Audio"], ["scenes", "Mouvement"],
];

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [reel, setReel] = useState<ReelFull | null>(null);
  const [err, setErr] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segsRef = useRef<Segment[]>([]);

  // options d'export
  const [opts, setOpts] = useState<ExportOpts>({ codec: "h264", res: "1080", format: "reel" });
  const [exp, setExp] = useState<ExportStatus | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    StudioAPI.reel(id)
      .then((r) => {
        setReel(r);
        segsRef.current = r.segments?.length
          ? r.segments
          : [{ start: Number(r.start) || 0, end: Number(r.end) || 0 }];
      })
      .catch(() => setErr(true));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [id]);

  const onLoaded = useCallback(() => {
    const v = videoRef.current;
    const s = segsRef.current[0];
    if (v && s) try { v.currentTime = s.start; } catch { /* noop */ }
  }, []);

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const segs = segsRef.current;
    const t = v.currentTime;
    const i = segs.findIndex((s) => t >= s.start - 0.05 && t < s.end);
    if (i === -1) {
      const nx = segs.find((s) => s.start > t);
      if (nx) v.currentTime = nx.start;
      else v.pause();
    } else if (t >= segs[i].end - 0.05) {
      if (i + 1 < segs.length) v.currentTime = segs[i + 1].start;
      else v.pause();
    }
  }, []);

  async function doExport() {
    setExp({ active: true, step: "…", pct: 0 });
    const d = await StudioAPI.exportReel(id, opts);
    if (d.error) { setExp({ active: false, step: "error", pct: 0, error: d.error }); return; }
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const s = await StudioAPI.exportStatus();
        setExp(s);
        if (!s.active && (s.step === "done" || s.step === "error")) {
          if (timer.current) clearInterval(timer.current);
        }
      } catch { /* noop */ }
    }, 1500);
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
          Engine hors ligne ou reel introuvable — lance <code>python app.py</code>.
        </p>
      </div>
    );
  }

  const score = reel?.ai_score ?? reel?.score;
  const conf = reel?.ai_confidence;
  const bd = reel?.ai_breakdown || {};

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/studio/reels" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="truncate text-xl font-bold">{reel?.best_title || reel?.category || "Montage"}</h1>
        <a
          href={id ? editorUrl(id) : "#"}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" /> Éditeur avancé
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Lecteur + timeline */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={id ? sourceUrl(id) : undefined}
              controls
              onLoadedMetadata={onLoaded}
              onTimeUpdate={onTime}
              className="max-h-[62vh] w-full bg-black"
            />
          </div>
          <SegmentBar segs={segsRef.current} onSeek={(t) => { if (videoRef.current) videoRef.current.currentTime = t; }} />
          <p className="mt-2 text-xs text-muted-foreground">
            Lecture par segments (les parties coupées sont sautées). Pour le découpage fin (trim, split, textes,
            photos, rotation), ouvre l’<span className="text-secondary">Éditeur avancé</span>.
          </p>
        </div>

        {/* Colonne droite : IA + export */}
        <div className="space-y-5">
          {/* Panneau IA */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-secondary" />
              <span className="text-sm font-semibold">AI Director</span>
              <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 font-mono text-sm font-bold text-primary-foreground">
                {score ?? "–"}/100
              </span>
            </div>
            {conf != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Confiance : <b className="text-foreground">{Math.round((conf || 0) * 100)}%</b>
              </p>
            )}
            {!!(reel?.ai_badges?.length) && <div className="mt-2 text-lg">{reel!.ai_badges!.join(" ")}</div>}
            {!!(reel?.ai_explain?.length || reel?.ai_reasons?.length) && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(reel?.ai_explain?.length ? reel.ai_explain : reel?.ai_reasons)!.slice(0, 6).map((x, i) => (
                  <li key={i}>• {x}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 space-y-1.5">
              {BD_ROWS.filter(([k]) => bd[k] != null).map(([k, lab]) => (
                <div key={k} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-muted-foreground">{lab}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/10">
                    <span className="block h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, bd[k])}%` }} />
                  </span>
                  <span className="w-6 text-right font-mono text-muted-foreground">{Math.round(bd[k])}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Export */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Download className="size-4 text-primary" />
              <span className="text-sm font-semibold">Export</span>
            </div>
            <label className="mb-1 block text-xs text-muted-foreground">Plateforme (format)</label>
            <select
              value={opts.format}
              onChange={(e) => setOpts({ ...opts, format: e.target.value })}
              className="mb-3 w-full rounded-lg border border-border bg-background p-2 text-sm"
            >
              {FORMATS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
            <div className="space-y-1.5 text-sm">
              <Toggle label="🎬 Style Arazzo (zoom + son + photos)" v={!!opts.template} on={(b) => setOpts({ ...opts, template: b })} />
              <Toggle label="🏷️ Logo Arazzo" v={!!opts.logo} on={(b) => setOpts({ ...opts, logo: b })} />
              <Toggle label="🔇 Nettoyage du son" v={!!opts.denoise} on={(b) => setOpts({ ...opts, denoise: b })} />
            </div>
            <button
              onClick={doExport}
              disabled={exp?.active}
              className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              ⬇️ Exporter le clip
            </button>
            {exp && (
              <div className="mt-3 text-xs">
                {exp.active && (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary/10">
                      <span className="block h-full bg-primary transition-all" style={{ width: `${exp.pct || 5}%` }} />
                    </div>
                    <p className="mt-1 text-muted-foreground">Export : {exp.step}…</p>
                  </>
                )}
                {!exp.active && exp.step === "done" && exp.file && (
                  <div className="flex flex-col gap-2">
                    <a href={downloadUrl(exp.file)} className="inline-flex items-center gap-1.5 font-semibold text-primary">
                      <Download className="size-3.5" /> Télécharger la vidéo
                    </a>
                    <button
                      onClick={() => { if (videoRef.current && exp.file) { videoRef.current.src = downloadUrl(exp.file); videoRef.current.play().catch(() => {}); } }}
                      className="inline-flex items-center gap-1.5 text-secondary"
                    >
                      <Play className="size-3.5" /> Prévisualiser le résultat
                    </button>
                  </div>
                )}
                {!exp.active && exp.step === "error" && <p className="text-destructive">Erreur : {exp.error}</p>}
              </div>
            )}
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3" /> Astuce : publie ensuite dans Instagram Edits (mobile)
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

function SegmentBar({ segs, onSeek }: { segs: Segment[]; onSeek: (t: number) => void }) {
  if (!segs.length) return null;
  const lo = Math.min(...segs.map((s) => s.start));
  const hi = Math.max(...segs.map((s) => s.end));
  const span = Math.max(0.1, hi - lo);
  return (
    <div className="relative mt-3 h-8 overflow-hidden rounded-lg border border-border bg-secondary/5">
      {segs.map((s, i) => (
        <button
          key={i}
          onClick={() => onSeek(s.start)}
          title={`${s.start.toFixed(1)}s → ${s.end.toFixed(1)}s`}
          className="absolute top-1 bottom-1 rounded bg-primary/70 transition hover:bg-primary"
          style={{ left: `${((s.start - lo) / span) * 100}%`, width: `${((s.end - s.start) / span) * 100}%` }}
        />
      ))}
    </div>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="accent-[hsl(var(--primary))]" />
      <span>{label}</span>
    </label>
  );
}
