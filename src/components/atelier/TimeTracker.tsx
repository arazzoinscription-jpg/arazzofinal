"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

function fmt(total: number) {
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function TimeTracker() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  return (
    <div className="bg-[#1e0a3c] rounded-2xl p-6 shadow-sm text-white h-full flex flex-col">
      <h3 className="font-bold text-lg">Minuterie</h3>
      <p className="text-xs text-white/50 mb-6">Session de couture en cours</p>

      <div className="flex-1 flex items-center justify-center">
        <span className="font-mono text-4xl font-bold tracking-widest tabular-nums">{fmt(seconds)}</span>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause" : "Démarrer"}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => { setRunning(false); setSeconds(0); }}
          aria-label="Arrêter"
          className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <Square size={16} fill="white" />
        </button>
      </div>
    </div>
  );
}
