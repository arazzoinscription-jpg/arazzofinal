"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";

export function CoinShootingCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="bg-[#1e0a3c] rounded-2xl p-6 shadow-sm text-white h-full flex flex-col">
      <h3 className="font-bold text-lg flex items-center gap-1.5">
        Coin Shooting <Sparkles size={16} className="text-[#E8650A]" />
      </h3>
      <p className="text-xs text-white/50 mb-4">Transformez vos photos en shooting pro</p>

      {/* Zone d'upload */}
      <button
        onClick={() => inputRef.current?.click()}
        className="flex-1 min-h-[110px] w-full rounded-xl border-2 border-dashed border-white/20 hover:border-[#E8650A]/60 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 text-white/60"
      >
        <ImagePlus size={26} />
        <span className="text-sm">{fileName ?? "Glissez une photo ici"}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </button>

      <button className="mt-4 w-full bg-[#6B21C8] hover:bg-[#5a1aad] text-white font-semibold py-2.5 rounded-xl transition-colors">
        Améliorer la photo
      </button>
      <p className="text-[11px] text-white/40 text-center mt-2">Propulsé par IA</p>
    </div>
  );
}
