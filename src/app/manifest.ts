import type { MetadataRoute } from "next";

// Web App Manifest (servi sur /manifest.webmanifest) → rend le site installable
// (« Ajouter à l'écran d'accueil ») et sert de base à l'app Capacitor future.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arazzo Formation",
    short_name: "Arazzo",
    description:
      "Formations couture, broderie et modélisme + patrons pour le Maghreb et sa diaspora.",
    id: "/",
    start_url: "/communaute",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0a1c",
    theme_color: "#6B21C8",
    lang: "fr",
    dir: "auto",
    categories: ["education", "shopping"],
    icons: [
      { src: "/images/arazzo-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/arazzo-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/arazzo-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
