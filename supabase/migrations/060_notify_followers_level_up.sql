-- ─────────────────────────────────────────────────────────────────────────────
-- 060 — Notifier les abonnés au passage d'un palier de niveau (option B)
-- ─────────────────────────────────────────────────────────────────────────────
-- Le niveau (users.level_label) est recalculé par calculate_level() à chaque gain
-- d'XP (award_xp, récompense de badge…). Plutôt que d'instrumenter chaque chemin,
-- un trigger unique sur le CHANGEMENT de level_label notifie les abonnés du membre
-- lorsqu'il franchit un palier (ex. « apprentie » → « couturière »).
--
-- Anti-spam : ne se déclenche QUE quand le libellé de niveau change réellement
-- (pas à chaque leçon / chaque point d'XP).

CREATE OR REPLACE FUNCTION public.notify_followers_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  -- Nom affiché : @username si présent, sinon le nom, sinon un libellé générique.
  v_label := COALESCE(
    CASE WHEN NEW.username IS NOT NULL AND NEW.username <> '' THEN '@' || NEW.username END,
    NEW.nom,
    'Un membre que vous suivez'
  );

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT f.follower_id,
         'community',
         v_label || ' a atteint le niveau « ' || NEW.level_label || ' »',
         NULL,
         '/communaute/u/' || NEW.id
  FROM public.follows f
  WHERE f.following_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_level_up ON public.users;
CREATE TRIGGER trg_notify_followers_level_up
  AFTER UPDATE OF level_label ON public.users
  FOR EACH ROW
  WHEN (
    NEW.level_label IS DISTINCT FROM OLD.level_label
    AND NEW.level_label IS NOT NULL
  )
  EXECUTE FUNCTION public.notify_followers_level_up();
