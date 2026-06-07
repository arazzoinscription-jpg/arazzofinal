-- 023 — Q&R sous la vidéo + travaux pratiques (photo + vidéo)

-- Questions / réponses (fil par leçon ; parent_id = réponse à une question)
CREATE TABLE IF NOT EXISTS public.lesson_questions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.lesson_questions(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lq_lesson ON public.lesson_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lq_parent ON public.lesson_questions(parent_id);
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;

-- Travaux pratiques soumis dans le lecteur de leçon (photo + vidéo)
CREATE TABLE IF NOT EXISTS public.lesson_practicals (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url  TEXT,
  video_url  TEXT,
  note       TEXT,
  feedback   TEXT,
  status     TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lp_lesson ON public.lesson_practicals(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lp_user ON public.lesson_practicals(user_id);
ALTER TABLE public.lesson_practicals ENABLE ROW LEVEL SECURITY;

-- Bucket public pour les travaux pratiques (photos + vidéos)
INSERT INTO storage.buckets (id, name, public) VALUES ('practicals', 'practicals', TRUE)
ON CONFLICT (id) DO NOTHING;
