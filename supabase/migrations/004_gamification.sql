-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 004 — Gamification : sync atomique badges + points + niveau + série
-- ═══════════════════════════════════════════════════════════════════════════

-- Recalcule l'état de gamification de l'utilisateur courant (auth.uid()).
-- Met à jour : série du jour, badges débloqués, points totaux, niveau.
DROP FUNCTION IF EXISTS public.sync_gamification();
CREATE OR REPLACE FUNCTION public.sync_gamification()
RETURNS TABLE (out_points INTEGER, out_level INTEGER, out_streak INTEGER, new_badges TEXT[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid          UUID := auth.uid();
  v_last       DATE;
  v_streak     INTEGER;
  v_longest    INTEGER;
  v_today      DATE := CURRENT_DATE;
  v_points     INTEGER;
  v_level      INTEGER;
  v_before     TEXT[];
  v_after      TEXT[];
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  -- Badges déjà obtenus (pour détecter les nouveaux)
  SELECT COALESCE(array_agg(b.code), '{}') INTO v_before
  FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = uid;

  -- ── Série d'apprentissage (jours consécutifs) ──
  SELECT ls.last_day, ls.current_streak, ls.longest_streak INTO v_last, v_streak, v_longest
  FROM learning_streaks ls WHERE ls.user_id = uid;
  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last = v_today THEN
    v_streak := COALESCE(v_streak, 1);             -- déjà compté aujourd'hui
  ELSIF v_last = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;         -- jour consécutif
  ELSE
    v_streak := 1;                                 -- série rompue
  END IF;
  v_longest := GREATEST(COALESCE(v_longest, 0), v_streak);
  INSERT INTO learning_streaks (user_id, current_streak, longest_streak, last_day)
  VALUES (uid, v_streak, v_longest, v_today)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_day = EXCLUDED.last_day;

  -- ── Attribution des badges (idempotent) ──
  -- 1ère leçon
  IF EXISTS (SELECT 1 FROM progress WHERE user_id = uid) THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='first_lesson'
    ON CONFLICT DO NOTHING;
  END IF;
  -- 1er module (un chapitre entièrement complété)
  IF EXISTS (
    SELECT 1 FROM chapters ch
    WHERE EXISTS (SELECT 1 FROM lessons l WHERE l.chapter_id = ch.id)
      AND NOT EXISTS (
        SELECT 1 FROM lessons l
        WHERE l.chapter_id = ch.id
          AND NOT EXISTS (SELECT 1 FROM progress p WHERE p.user_id = uid AND p.lesson_id = l.id)
      )
  ) THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='first_module'
    ON CONFLICT DO NOTHING;
  END IF;
  -- 1ère question
  IF EXISTS (SELECT 1 FROM qa_questions WHERE user_id = uid) THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='first_question'
    ON CONFLICT DO NOTHING;
  END IF;
  -- Formation terminée (certificat émis)
  IF EXISTS (SELECT 1 FROM certificates WHERE user_id = uid) THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='course_done'
    ON CONFLICT DO NOTHING;
  END IF;
  -- Séries
  IF v_streak >= 7 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='streak_7' ON CONFLICT DO NOTHING;
  END IF;
  IF v_streak >= 30 THEN
    INSERT INTO user_badges (user_id, badge_id) SELECT uid, id FROM badges WHERE code='streak_30' ON CONFLICT DO NOTHING;
  END IF;

  -- ── Points + niveau ──
  SELECT COALESCE(SUM(b.points), 0) INTO v_points
  FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = uid;
  v_points := v_points + COALESCE((SELECT SUM(points) FROM points_log WHERE user_id = uid), 0);
  v_level := 1 + (v_points / 100);
  UPDATE users SET total_points = v_points, level = v_level WHERE id = uid;

  -- Nouveaux badges (créer une notification pour chacun)
  SELECT COALESCE(array_agg(b.code), '{}') INTO v_after
  FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = uid;

  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT uid, 'badge', '🏅 Nouveau badge : ' || b.titre, b.description, '/dashboard'
  FROM badges b
  WHERE b.code = ANY(v_after) AND NOT (b.code = ANY(v_before));

  RETURN QUERY SELECT v_points, v_level, v_streak,
    ARRAY(SELECT unnest(v_after) EXCEPT SELECT unnest(v_before));
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_gamification() TO authenticated;
