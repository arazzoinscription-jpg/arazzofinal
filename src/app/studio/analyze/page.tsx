"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Video, Check, X, Pin } from "lucide-react";
import { StudioAPI, videoUrl, type VideoItem, type Marker, type TimelineResp } from "@/lib/studio-api";

const LEG: Record<string, { e: string; l: string }> = {
  keep: { e: "🟢", l: "à garder" },
  check: { e: "🟡", l: "à vérifier" },
  cut: { e: "🔴", l: "suppression" },
  improve: { e: "🔵", l: "amélioration" },
  done: { e: "🟣", l: "appliqué" },
};
const BORDER: Record<string, string> = {
  cut: "border-l-destructive",
  check: "border-l-amber-500",
  keep: "border-l-emerald-500",
  improve: "border-l-secondary",
};

export default function StudioAnalyzePage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [stem, setStem] = useState("");
  const [data, setData] = useState<TimelineResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endRef = useRef<number | null>(null);

  useEffect(() => {
    StudioAPI.videos().then((d) => setVideos(d.videos)).catch(() => setErr(true));
  }, []);

  async function pick(s: string) {
    setStem(s);
    setData(null);
    if (!s) return;
    setLoading(true);
    try {
      setData(await StudioAPI.timeline(s));
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  const playAt = useCallback((m: Marker) => {
    const v = videoRef.current;
    if (!v) return;
    endRef.current = m.end || null;
    setPlaying(m.id);
    try { v.currentTime = Math.max(0, m.start - 0.3); } catch { /* noop */ }
    v.play().catch(() => {});
  }, []);

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (v && endRef.current != null && v.currentTime >= endRef.current) {
      v.pause();
      endRef.current = null;
    }
  }, []);

  async function decide(m: Marker, decision: string) {
    await StudioAPI.decide(stem, m.id, decision);
    setData((d) => d && { ...d, markers: d.markers.map((x) => (x.id === m.id ? { ...x, decision } : x)) });
  }

  async function addQuality() {
    const q = await StudioAPI.quality(stem);
    if (q.count) setData((d) => d && { ...d, markers: [...q.markers, ...d.markers] });
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-10">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/studio" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Analyse du cours</h1>
      </div>

      {err && !videos.length ? (
        <p className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
          Engine hors ligne — lance <code>python app.py</code>.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Choisis un cours : l&apos;IA détecte problèmes et opportunités, tu regardes chaque moment et tu décides.
          </p>
          <select
            value={stem}
            onChange={(e) => pick(e.target.value)}
            className="mb-6 w-full rounded-xl border border-border bg-card p-3 text-sm"
          >
            <option value="">— choisir un cours —</option>
            {videos.map((v) => (
              <option key={v.stem} value={v.stem}>
                {v.stem} · {Math.round(v.duration / 60)}min · {v.segments} segments
              </option>
            ))}
          </select>

          {loading && <p className="text-sm text-muted-foreground">🔎 Analyse en cours…</p>}

          {data && !data.error && (
            <>
              {/* Lecteur */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoUrl(stem)}
                controls
                preload="metadata"
                onTimeUpdate={onTime}
                className="mb-2 max-h-[52vh] w-full rounded-xl border border-border bg-black"
              />
              <p className="mb-4 text-xs text-muted-foreground">
                👆 Clique un moment pour le voir, puis décide (✓ garder · <Pin className="inline size-3" /> appliquer · ✕ ignorer).
              </p>

              {/* Légende + qualité */}
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {Object.entries(LEG).filter(([k]) => data.counts[k]).map(([k, v]) => (
                  <span key={k}>{v.e} {v.l} <b className="text-foreground">{data.counts[k]}</b></span>
                ))}
                <button
                  onClick={addQuality}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-secondary"
                >
                  <Video className="size-3.5" /> Vérifier la qualité vidéo
                </button>
              </div>

              {/* Marqueurs */}
              <div className="space-y-2">
                {data.markers.map((m) => (
                  <MarkerRow key={m.id} m={m} playing={playing === m.id} onPlay={() => playAt(m)} onDecide={(d) => decide(m, d)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MarkerRow({
  m, playing, onPlay, onDecide,
}: {
  m: Marker; playing: boolean; onPlay: () => void; onDecide: (d: string) => void;
}) {
  const mn = Math.floor(m.start / 60);
  const sc = Math.round(m.start % 60);
  const dim = m.decision === "ignore";
  const done = m.decision === "apply";
  return (
    <div
      onClick={onPlay}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border border-border border-l-4 bg-card p-2.5 pl-3 ${
        BORDER[m.type] || "border-l-border"
      } ${dim ? "opacity-40" : ""} ${done ? "ring-1 ring-secondary/40" : ""} ${
        playing ? "shadow-[inset_4px_0_0_hsl(var(--primary))]" : ""
      }`}
    >
      <span className="text-base">{done ? "🟣" : m.emoji}</span>
      <span className="rounded bg-secondary/10 px-2 py-0.5 font-mono text-[11px] text-secondary">
        {mn}:{String(sc).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{m.reason}</div>
        <div className="text-[10px] text-muted-foreground">{m.action} · {m.score}%</div>
      </div>
      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <IconBtn onClick={() => onDecide("keep")}><Check className="size-3.5" /></IconBtn>
        <IconBtn onClick={() => onDecide("apply")}><Pin className="size-3.5" /></IconBtn>
        <IconBtn onClick={() => onDecide("ignore")}><X className="size-3.5" /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
    >
      {children}
    </button>
  );
}
