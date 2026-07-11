-- ─────────────────────────────────────────────────────────────────────────────
-- 070 — Preuves de paiement « déjà payé sur Telegram » (étudiants importés)
-- ─────────────────────────────────────────────────────────────────────────────
-- Les étudiantes migrées depuis l'ancien système (Telegram / WordPress) ont une
-- inscription à 0 DA. Elles doivent téléverser la preuve du paiement DÉJÀ effectué
-- sur Telegram. Ces preuves sont listées à part dans l'admin et NE COMPTENT PAS
-- dans les gains du site (aucune inscription payante n'est créée : le fichier est
-- seulement enregistré ici).

CREATE TABLE IF NOT EXISTS public.telegram_payment_proofs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_path   text NOT NULL,                 -- chemin dans le bucket Storage « proofs »
  file_type   text,                          -- jpg | png | pdf
  note        text,                          -- remarque éventuelle de l'étudiante
  status      text NOT NULL DEFAULT 'received', -- received | verified | rejected
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_proofs_user ON public.telegram_payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_proofs_created ON public.telegram_payment_proofs(created_at DESC);

-- Une seule preuve « active » par étudiante (évite les doublons ; on remplace).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tg_proof_user ON public.telegram_payment_proofs(user_id);

-- RLS activé sans policy publique : tout l'accès passe par le service role
-- (Server Actions / pages admin). Les clients anon/authenticated sont refusés.
ALTER TABLE public.telegram_payment_proofs ENABLE ROW LEVEL SECURITY;
