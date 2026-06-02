-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003 — Notifications de mises à jour des formations (Feature 3)
-- ═══════════════════════════════════════════════════════════════════════════

-- Contexte cours sur les notifications (pour le badge "Nouveau contenu")
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- ─── Trigger : nouvelle leçon → notifie les inscrites du cours ───────────────
CREATE OR REPLACE FUNCTION public.notify_new_lesson()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_course_id    UUID;
  v_course_title TEXT;
BEGIN
  SELECT ch.course_id INTO v_course_id FROM public.chapters ch WHERE ch.id = NEW.chapter_id;
  IF v_course_id IS NULL THEN RETURN NEW; END IF;
  SELECT titre_fr INTO v_course_title FROM public.courses WHERE id = v_course_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, course_id)
  SELECT e.user_id,
         'new_content',
         'Nouveau contenu : ' || COALESCE(v_course_title, 'votre formation'),
         'Une nouvelle leçon « ' || NEW.titre || ' » vient d''être ajoutée.',
         '/dashboard/cours/' || NEW.id,
         v_course_id
  FROM public.enrollments e
  WHERE e.course_id = v_course_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lesson ON public.lessons;
CREATE TRIGGER trg_notify_new_lesson
  AFTER INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lesson();

-- ─── Trigger : nouveau chapitre (module) → notifie les inscrites ─────────────
CREATE OR REPLACE FUNCTION public.notify_new_chapter()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_course_title TEXT;
BEGIN
  SELECT titre_fr INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, course_id)
  SELECT e.user_id,
         'new_content',
         'Nouveau module : ' || COALESCE(v_course_title, 'votre formation'),
         'Le module « ' || NEW.titre || ' » a été ajouté.',
         '/dashboard',
         NEW.course_id
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_chapter ON public.chapters;
CREATE TRIGGER trg_notify_new_chapter
  AFTER INSERT ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_chapter();

-- ─── Activer Supabase Realtime sur les notifications + messages ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
