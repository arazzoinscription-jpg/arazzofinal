import type { ReactNode } from "react";

export const metadata = {
  title: "Studio — Arazzo Formation",
  description: "Assistant IA de montage des cours de couture.",
};

// Module Studio : intégré au site, mais dialoguant avec l'Arazzo Engine local.
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
}
