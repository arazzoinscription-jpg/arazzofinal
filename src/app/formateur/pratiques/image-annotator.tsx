"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Undo2, Eraser, Loader2, Check } from "lucide-react";
import { savePracticalAnnotation } from "@/app/dashboard/cours/[id]/extras-actions";
import { toast } from "@/components/ui/toast";

const COLORS = ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#111827", "#FFFFFF"];
const SIZES = [3, 6, 12];

type Stroke = { color: string; size: number; points: { x: number; y: number }[] };

/**
 * Éditeur d'annotation « façon Telegram » : ouvre la photo du travail pratique,
 * on dessine dessus (crayon couleur + épaisseur), on annule, on efface tout, puis
 * on enregistre → la photo aplatie avec les annotations est envoyée au serveur.
 */
export function ImageAnnotator({ practicalId, imageUrl, onClose }: { practicalId: string; imageUrl: string; onClose: () => void }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef(false);
  const [ready, setReady] = useState(false);
  const [saving, start] = useTransition();

  // Charge la photo dans le canvas (dimensionné à la taille naturelle, plafonnée).
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // requis pour exporter le canvas (CORS Bunny)
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      setReady(true);
    };
    img.onerror = () => toast("Impossible de charger l'image (CORS).", "error");
    img.src = imageUrl;
  }, [imageUrl]);

  // Redessine à chaque changement (photo + tous les traits).
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }, [strokes, ready]);

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  function down(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    setStrokes((s) => [...s, { color, size, points: [pos(e)] }]);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = pos(e);
    setStrokes((s) => { const n = [...s]; n[n.length - 1] = { ...n[n.length - 1], points: [...n[n.length - 1].points, p] }; return n; });
  }
  function up() { drawing.current = false; }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (strokes.length === 0) { toast("Dessinez vos remarques avant d'enregistrer.", "error"); return; }
    let dataUrl: string;
    try { dataUrl = canvas.toDataURL("image/jpeg", 0.9); }
    catch { toast("Export impossible (image protégée par CORS).", "error"); return; }
    start(async () => {
      const res = await savePracticalAnnotation(practicalId, dataUrl);
      if (res.ok) { toast("Photo annotée enregistrée ✅", "success"); router.refresh(); onClose(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#15102b] text-white pt-[max(12px,env(safe-area-inset-top))]">
        <span className="font-semibold text-sm me-2">✏️ Annoter la photo</span>
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-white scale-110" : "border-white/30"} transition-transform`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 ms-1">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} aria-label={`Épaisseur ${s}`}
              className={`w-8 h-8 rounded-lg grid place-items-center ${size === s ? "bg-orange-DEFAULT" : "bg-white/10"}`}>
              <span className="rounded-full bg-white block" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
        </div>
        <button onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm disabled:opacity-40">
          <Undo2 size={15} /> Annuler
        </button>
        <button onClick={() => setStrokes([])} disabled={!strokes.length}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm disabled:opacity-40">
          <Eraser size={15} /> Tout effacer
        </button>
        <div className="flex-1" />
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Enregistrer
        </button>
        <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><X size={18} /></button>
      </div>

      {/* Zone de dessin */}
      <div className="flex-1 overflow-auto grid place-items-center p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {!ready && <Loader2 size={32} className="animate-spin text-white/70" />}
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="max-w-full h-auto rounded-xl shadow-2xl bg-white touch-none cursor-crosshair"
          style={{ display: ready ? "block" : "none" }}
        />
      </div>
    </div>
  );
}
