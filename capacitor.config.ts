import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration Capacitor — coque native Android (Play Store) + iOS (App Store).
 *
 * L'app charge le SITE EN LIGNE (server.url) : tout le SSR Next.js, les
 * paiements, la communauté et les mises à jour restent côté serveur — aucune
 * republication sur les stores n'est nécessaire pour changer le contenu.
 *
 * Voir MOBILE_STORES.md pour les étapes de publication complètes.
 */
const config: CapacitorConfig = {
  appId: "store.formationarazzo.app",
  appName: "Arazzo Formation",
  // Dossier web minimal (page de secours) : non utilisé au runtime car
  // server.url pointe vers le site en production (coque WebView distante).
  // NE PAS mettre "public" ici : ses ~80 Mo de vidéos gonfleraient l'APK.
  webDir: "capacitor-web",
  server: {
    // L'app s'ouvre directement sur le feed communauté (public : visible connecté ou non).
    url: "https://www.formation-arazzo.store/communaute",
    // Autorise la navigation interne sur le domaine (les liens externes
    // s'ouvrent dans le navigateur du téléphone).
    allowNavigation: ["www.formation-arazzo.store", "formation-arazzo.store"],
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
