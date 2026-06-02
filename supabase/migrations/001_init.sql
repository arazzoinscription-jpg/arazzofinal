-- ─────────────────────────────────────────────────────────────────────────────
-- Arazzo Formation — Schema complet
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'eleve' CHECK (role IN ('eleve', 'formateur', 'admin')),
  ville       TEXT,
  pays        TEXT DEFAULT 'DZ',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create user record on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, nom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── COURSES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre_fr        TEXT NOT NULL,
  titre_ar        TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description_fr  TEXT,
  description_ar  TEXT,
  prix_dzd        INTEGER NOT NULL DEFAULT 0,
  prix_eur        NUMERIC(10,2) NOT NULL DEFAULT 0,
  niveau          TEXT DEFAULT 'debutant' CHECK (niveau IN ('debutant', 'intermediaire', 'avance')),
  duree           TEXT,
  formateur_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  thumbnail       TEXT,
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_formateur ON public.courses(formateur_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(published);

-- ─── CHAPTERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_course ON public.chapters(course_id);

-- ─── LESSONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id      UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  video_url_bunny TEXT,
  duree_minutes   INTEGER,
  ordre           INTEGER NOT NULL DEFAULT 0,
  is_preview      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id);

-- ─── ENROLLMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR')),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);

-- ─── PROGRESS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress(user_id);

-- ─── PATRONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patrons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre        TEXT NOT NULL,
  description  TEXT,
  prix_dzd     INTEGER NOT NULL DEFAULT 0,
  prix_eur     NUMERIC(10,2) NOT NULL DEFAULT 0,
  fichier_url  TEXT NOT NULL,
  preview_url  TEXT,
  formateur_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PATRON PURCHASES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patron_purchases (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patron_id  UUID NOT NULL REFERENCES public.patrons(id) ON DELETE CASCADE,
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, patron_id)
);

-- ─── CERTIFICATES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certificates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uuid_public UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_uuid ON public.certificates(uuid_public);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  note        SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patron_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users: can read own, admin reads all
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Courses: anyone reads published, formateurs manage their own
CREATE POLICY "courses_read_published" ON public.courses FOR SELECT USING (published = TRUE OR auth.uid() = formateur_id);
CREATE POLICY "courses_insert_formateur" ON public.courses FOR INSERT WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "courses_update_formateur" ON public.courses FOR UPDATE USING (auth.uid() = formateur_id);

-- Chapters/Lessons: readable if course is published or user is formateur
CREATE POLICY "chapters_read" ON public.chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND (published OR formateur_id = auth.uid()))
);
CREATE POLICY "chapters_manage" ON public.chapters FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND formateur_id = auth.uid())
);
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM chapters ch JOIN courses c ON c.id = ch.course_id
          WHERE ch.id = chapter_id AND (c.published OR c.formateur_id = auth.uid()))
);
CREATE POLICY "lessons_manage" ON public.lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM chapters ch JOIN courses c ON c.id = ch.course_id
          WHERE ch.id = chapter_id AND c.formateur_id = auth.uid())
);

-- Enrollments: users see own, formateurs see their course enrollments
CREATE POLICY "enrollments_read_own" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Progress: users manage own
CREATE POLICY "progress_own" ON public.progress FOR ALL USING (auth.uid() = user_id);

-- Patrons: public read
CREATE POLICY "patrons_read" ON public.patrons FOR SELECT USING (TRUE);
CREATE POLICY "patrons_manage" ON public.patrons FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('formateur', 'admin'))
);

-- Patron purchases: own only
CREATE POLICY "patron_purchases_own" ON public.patron_purchases FOR ALL USING (auth.uid() = user_id);

-- Certificates: own or public UUID lookup
CREATE POLICY "certificates_own" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "certificates_insert" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews: public read, own insert/update
CREATE POLICY "reviews_read" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_own" ON public.reviews FOR ALL USING (auth.uid() = user_id);
