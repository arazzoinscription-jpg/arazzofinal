"use client";

import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div>
      <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-cream-100 border border-cream-200">
        <img src={main} alt={alt} className="w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-20 h-24 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                i === active ? "border-orange-DEFAULT" : "border-transparent hover:border-cream-300"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
