"use client";

import { useRouter } from "next/navigation";
import { ButtonColorful } from "@/components/ui/button-colorful";

/** CTA du héro boutique : bouton coloré qui mène au catalogue de formations. */
export function HeroCta({ label, href = "/formations" }: { label: string; href?: string }) {
  const router = useRouter();
  return (
    <ButtonColorful
      label={label}
      onClick={() => router.push(href)}
      className="mt-6 h-11 px-6 rounded-xl"
    />
  );
}
