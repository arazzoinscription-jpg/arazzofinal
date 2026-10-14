import "server-only";

/**
 * Point d'entrée SERVEUR du chargement du suivi : `server-only` garantit qu'il
 * ne finit jamais dans un paquet envoyé au navigateur. La logique vit dans
 * `read.ts` (client Supabase fourni par l'appelant).
 */
export * from "./read";
