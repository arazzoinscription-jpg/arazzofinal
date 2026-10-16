-- ═══════════════════════════════════════════════════════════════════════════
-- 098 — CLOCHE DE CLASSE (Ma classe → Espace de commande)
-- ───────────────────────────────────────────────────────────────────────────
-- L'enseignante fait « sonner la cloche » pour une classe (un groupe) ou un
-- niveau : tout de suite, ou à une date et une heure. Chaque élève reçoit une
-- notification (cloche du site + notification du téléphone via le webhook push
-- existant sur public.notifications). Aucune donnée existante n'est modifiée.
-- Se rejoue sans dommage.
--
-- Les cloches PROGRAMMÉES partent quand /api/cron/cloches est appelé (voir le
-- bloc facultatif en bas : un appel par minute via pg_cron + pg_net).
--
-- Retour arrière (perd uniquement les cloches) :
--   DROP TABLE IF EXISTS public.classe_cloches;
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.classe_cloches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- La classe visée : un groupe OU un niveau (cours).
  group_id      UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  course_id     UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  message       TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 200),
  sonne_le      TIMESTAMPTZ NOT NULL,
  -- Rempli UNE fois, au moment de l'envoi (réservation atomique : jamais deux envois).
  envoyee_le    TIMESTAMPTZ,
  destinataires INTEGER,
  annulee_le    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classe_cloches_cible CHECK (group_id IS NOT NULL OR course_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS classe_cloches_a_sonner_idx
  ON public.classe_cloches (sonne_le) WHERE envoyee_le IS NULL AND annulee_le IS NULL;
CREATE INDEX IF NOT EXISTS classe_cloches_auteur_idx ON public.classe_cloches (created_by, sonne_le DESC);

-- Lecture / écriture par le serveur uniquement (clé de service) : aucun accès direct.
ALTER TABLE public.classe_cloches ENABLE ROW LEVEL SECURITY;

-- ─── Facultatif : faire partir les cloches programmées à la minute ──────────
-- Nécessite les extensions pg_cron et pg_net (Supabase → Database → Extensions).
-- Remplacer <CRON_SECRET> par la valeur de la variable CRON_SECRET de Vercel.
--
-- SELECT cron.schedule(
--   'arazzo-cloches',
--   '* * * * *',
--   $$ SELECT net.http_get(
--        url := 'https://www.formation-arazzo.store/api/cron/cloches',
--        headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
--      ) $$
-- );
-- Pour arrêter : SELECT cron.unschedule('arazzo-cloches');
