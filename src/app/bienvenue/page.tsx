import { cookies } from "next/headers";
import { normLang } from "@/lib/store-i18n";
import { WelcomeClient } from "./welcome-client";

export const metadata = {
  title: "Bienvenue — Arazzo Formation",
  description: "La plateforme de création & production : formation couture et patronnage numérique.",
};

/** Écran d'accueil (splash) mobile-first : vidéo de fond + invitation à s'inscrire. */
export default async function BienvenuePage() {
  const lang = normLang((await cookies()).get("lang")?.value);
  return <WelcomeClient lang={lang} />;
}
