-- ═══════════════════════════════════════════════════════════════════════════
-- À APPLIQUER UNE SEULE FOIS dans Supabase → SQL Editor → coller → RUN.
-- Regroupe les migrations en attente (toutes additives / sans risque,
-- idempotentes grâce à IF NOT EXISTS). Active : devoir obligatoire, gains
-- formateur, préférences emails, preuves Telegram, reels élèves.
-- ═══════════════════════════════════════════════════════════════════════════

-- ======================= 062_lesson_devoir_obligatoire =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 062 — Devoir de leçon obligatoire (gate du diplôme)
-- ─────────────────────────────────────────────────────────────────────────────
-- • devoir_obligatoire : si TRUE, ce devoir de leçon DOIT être validé (travail
--   pratique approuvé) pour débloquer le diplôme du cours. Défaut FALSE (opt-in) :
--   aucun changement pour l'existant tant que le formateur ne coche rien.
-- • Backfill : chaque leçon SANS devoir reçoit la consigne standard demandée
--   (on ne remplace PAS les devoirs déjà personnalisés par le formateur).

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS devoir_obligatoire BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lessons_devoir_obligatoire
  ON public.lessons(devoir_obligatoire) WHERE devoir_obligatoire = TRUE;

UPDATE public.lessons
SET devoir = 'Résumer le cours + dessiner le patron + vidéo de montage d''une pièce.'
WHERE devoir IS NULL OR btrim(devoir) = '';

-- ======================= 068_formateur_rate_individuel =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 068 — Taux de commission INDIVIDUEL par formateur
-- ─────────────────────────────────────────────────────────────────────────────
-- L'admin peut régler les gains de CHAQUE formateur : un taux propre (en %)
-- stocké sur son profil. NULL = le taux global `formateur_commission_rate`
-- de platform_config s'applique (comportement actuel inchangé).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS formateur_commission_rate NUMERIC
  CHECK (formateur_commission_rate IS NULL OR (formateur_commission_rate >= 0 AND formateur_commission_rate <= 100));

-- ======================= 069_email_category_settings =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 069 — Préférences ADMIN des emails par catégorie
-- ─────────────────────────────────────────────────────────────────────────────
-- L'admin choisit quels TYPES d'emails la plateforme envoie (page
-- /admin/preferences). JSONB catégorie → booléen ; catégorie absente = activée.
-- Vérifié au centre par sendEmail (src/lib/email.ts) avant tout envoi
-- (sauf emails critiques envoyés avec force: true).

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS email_categories JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ======================= 070_telegram_payment_proofs =======================
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

-- ======================= 071_telegram_proof_payment_type =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 071 — Preuve Telegram : type de paiement + plusieurs photos
-- ─────────────────────────────────────────────────────────────────────────────
-- L'étudiante précise si elle a payé en TOTALITÉ (une seule photo) ou en
-- ABONNEMENT / tranches (plusieurs photos). `file_paths` stocke toutes les
-- photos ; `file_path` reste la première (compatibilité migration 070).

ALTER TABLE public.telegram_payment_proofs
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'total'
    CHECK (payment_type IN ('total', 'abonnement'));

ALTER TABLE public.telegram_payment_proofs
  ADD COLUMN IF NOT EXISTS file_paths text[] NOT NULL DEFAULT '{}'::text[];

-- ======================= 072_telegram_proof_deadline =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 072 — Preuve Telegram : délai de 7 jours puis blocage du compte
-- ─────────────────────────────────────────────────────────────────────────────
-- `telegram_notified_at` = date de PREMIÈRE présentation du rappel à l'étudiante
-- importée (posée automatiquement à sa première visite du tableau de bord).
-- 7 jours plus tard, si aucune preuve n'a été envoyée, l'accès à l'espace est
-- bloqué jusqu'à l'envoi de la preuve finale.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_notified_at timestamptz;

-- ======================= 073_community_student_reels =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 073 — Reels des élèves dans le feed communauté
-- ─────────────────────────────────────────────────────────────────────────────
-- Les élèves peuvent publier de courtes vidéos « reel » (≤ 2 min) dans le feed,
-- comme les formateurs et patronnistes. Nouveau source_type « student_reel ».

ALTER TABLE public.community_media
  DROP CONSTRAINT IF EXISTS community_media_source_type_check;

ALTER TABLE public.community_media
  ADD CONSTRAINT community_media_source_type_check
  CHECK (source_type IN ('admin', 'course_teaser', 'practical', 'patron_demo', 'student_reel'));


-- ======================= 074_pack_category =======================
-- ─────────────────────────────────────────────────────────────────────────────
-- 074 — Catégorie d'un pack de cours (affichage dans l'offre)
-- ─────────────────────────────────────────────────────────────────────────────
-- Permet de ranger un pack sous une catégorie (ex. « Modélisme femme ») pour
-- qu'il apparaisse dans la page Offre quand on clique sur cette catégorie.
-- NULL = pack non rangé (n'apparaît pas dans une catégorie de l'offre).

ALTER TABLE public.course_packs
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_packs_category ON public.course_packs(category_id);
