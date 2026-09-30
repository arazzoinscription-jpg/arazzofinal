/**
 * Les trois niveaux en ligne : slug de la landing → identifiant du cours dans le LMS.
 * Sert à résoudre les formations d'un pack composé dans l'OS (dont les membres sont
 * des slugs « niveau-N »). Même correspondance que les pages /offres et /pack.
 */
export const NIVEAUX: Record<string, string> = {
  "niveau-1": "23bee490-103a-492d-9253-256178658e02",
  "niveau-2": "b100190c-4f95-4f63-bd22-7a561f9666de",
  "niveau-3": "de1da439-6dc9-4cf0-9526-e44af4c5073b",
};
