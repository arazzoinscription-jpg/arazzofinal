-- 048 — Une seule session active par compte élève (anti-partage de compte)
-- On mémorise l'identifiant de l'appareil actuellement autorisé. À chaque
-- connexion sur un nouvel appareil, cet identifiant est remplacé : l'ancien
-- appareil est alors déconnecté au prochain chargement d'une page protégée.
-- (Le contrôle est fait dans le middleware, uniquement pour le rôle « eleve ».)

alter table public.users add column if not exists active_session_id text;
