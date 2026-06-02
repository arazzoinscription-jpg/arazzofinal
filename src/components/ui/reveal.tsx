"use client";

import { useEffect, useRef, useState } from "react";

type Anim = "up" | "left" | "right" | "zoom" | "fade";

const hidden: Record<Anim, string> = {
  up:    "opacity-0 translate-y-10",
  left:  "opacity-0 -translate-x-10",
  right: "opacity-0 translate-x-10",
  zoom:  "opacity-0 scale-95",
  fade:  "opacity-0",
};

export function Reveal({
  children,
  className = "",
  animation = "up",
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  animation?: Anim;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[800ms] ease-[cubic-bezier(.2,.7,.3,1)] ${
        shown ? "opacity-100 translate-x-0 translate-y-0 scale-100" : hidden[animation]
      } ${className}`}
    >
      {children}
    </div>
  );
}
