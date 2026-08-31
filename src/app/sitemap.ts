import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/site-url";

/**
 * sitemap.xml — généré par Next (App Router), servi sur /sitemap.xml.
 *
 * Liste les pages PUBLIQUES du site pour que Google les découvre sans avoir à
 * les deviner — le levier n°1 pour indexer un site récent. Volontairement
 * limité aux pages de contenu : ni tunnel d'achat, ni compte, ni admin (ceux-là
 * sont exclus dans robots.txt).
 *
 * Les pages dynamiques (formations/[slug], patrons/[id]) ne sont pas listées
 * ici pour ne pas coupler la génération du sitemap à la base au moment du build :
 * Google les découvre en suivant les liens depuis /formations et /patrons. On
 * pourra les ajouter plus tard en lisant la liste des formations publiées.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = canonicalSiteUrl();
  const now = new Date();

  // [chemin, priorité, fréquence] — les pages « argent » d'abord.
  const routes: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["", 1.0, "weekly"], // accueil
    ["/formations", 0.9, "weekly"],
    ["/offre", 0.9, "weekly"],
    ["/tarifs", 0.9, "monthly"],
    ["/patrons", 0.8, "weekly"],
    ["/boutique", 0.8, "weekly"],
    ["/rejoindre", 0.7, "monthly"],
    ["/devenir-formateur", 0.6, "monthly"],
    ["/a-propos", 0.5, "yearly"],
    ["/aide", 0.5, "monthly"],
    ["/contact", 0.5, "yearly"],
    ["/cgu", 0.3, "yearly"],
    ["/cgv", 0.3, "yearly"],
    ["/confidentialite", 0.3, "yearly"],
  ];

  return routes.map(([path, priority, changeFrequency]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
