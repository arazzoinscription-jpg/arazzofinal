"use client";

import { useEffect, useRef, useState } from "react";
import { ScissorsIcon } from "./scissors";

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  sub,
  light = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  highlight?: string;
  sub?: string;
  light?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setOn(true), io.disconnect()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center mb-14">
      {/* Ciseaux logo + lignes de couture animées */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span
          className="border-t-2 border-dashed border-blush-400 transition-all duration-700 ease-out"
          style={{ width: on ? 56 : 0 }}
        />
        <span
          className={`text-blush-500 transition-all duration-700 ${
            on ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
          }`}
        >
          <ScissorsIcon className="w-6 h-6" />
        </span>
        <span
          className="border-t-2 border-dashed border-blush-400 transition-all duration-700 ease-out"
          style={{ width: on ? 56 : 0 }}
        />
      </div>

      <span
        className={`block font-dm font-semibold text-sm tracking-[0.22em] uppercase mb-3 transition-all duration-700 delay-150 ${
          on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        } ${light ? "text-blush-200" : "text-blush-500"}`}
      >
        {eyebrow}
      </span>

      <h2
        className={`font-playfair text-4xl lg:text-5xl font-bold transition-all duration-700 delay-200 ${
          on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        } ${light ? "text-white" : "text-gray-900 dark:text-white"}`}
      >
        {title}{" "}
        {highlight && <span className="text-gradient-rose italic">{highlight}</span>}
      </h2>

      {sub && (
        <p
          className={`mt-3 font-dm text-lg transition-all duration-700 delay-300 ${
            on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          } ${light ? "text-violet-200" : "text-gray-500 dark:text-white/50"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
