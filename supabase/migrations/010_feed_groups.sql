-- ════════════════════════════════════════════════════════════════════
-- 010 — Fil d'actualités & Groupes
-- Feed global (group_id NULL) + feed privé par groupe, likes, commentaires.
-- Images des publications supprimées physiquement après 48h (cron).
-- Idempotent : CREATE ... IF NOT EXISTS + gardes DO pour les policies.
-- ════════════════════════════════════════════════════════════════════

-- ── Groupes ──
CREATE TABLE IF NOT EXISTS public.groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON public.groups(creator_id);

CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- ── Publications ──
CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES public.groups(id) ON DELETE CASCADE, -- NULL = feed global
  content     TEXT,
  image_url   TEXT,                                                -- 1ère image (raccourci d'affichage)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_group ON public.posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);

-- Images des publications (règle des 48h)
CREATE TABLE IF NOT EXISTS public.post_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url     TEXT,                       -- mis à NULL à l'expiration
  storage_path  TEXT,                       -- chemin dans le bucket (pour suppression physique)
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON public.post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_expiry ON public.post_images(expired, uploaded_at);

-- ── Likes ──
CREATE TABLE IF NOT EXISTS public.likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);

-- ── Commentaires ──
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);

-- ── Helper : un utilisateur peut-il voir une publication ? ──
-- SECURITY DEFINER → contourne la RLS à l'intérieur, évite la récursion de policy.
CREATE OR REPLACE FUNCTION public.can_see_post(p_post UUID, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = p_post AND (
      p.group_id IS NULL
      OR p.author_id = p_uid
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = p.group_id AND gm.user_id = p_uid)
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = p.group_id AND g.creator_id = p_uid)
    )
  );
$$;

-- ── RLS ──
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Groupes : visibles par le créateur et les membres
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='groups_read') THEN
    CREATE POLICY "groups_read" ON public.groups FOR SELECT USING (
      creator_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid())
    );
  END IF;
  -- Création : seulement formateur ou admin
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='groups_insert') THEN
    CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (
      creator_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('formateur','admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='groups_update') THEN
    CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (creator_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='groups_delete') THEN
    CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (creator_id = auth.uid());
  END IF;

  -- Membres : le membre se voit, le créateur voit tout ; gestion par le créateur
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='gm_read') THEN
    CREATE POLICY "gm_read" ON public.group_members FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='gm_manage') THEN
    CREATE POLICY "gm_manage" ON public.group_members FOR ALL USING (
      EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
    );
  END IF;

  -- Publications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_read') THEN
    CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (
      group_id IS NULL
      OR author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = posts.group_id AND gm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = posts.group_id AND g.creator_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_insert') THEN
    CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (
      author_id = auth.uid()
      AND (
        group_id IS NULL
        OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = posts.group_id AND gm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = posts.group_id AND g.creator_id = auth.uid())
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_update') THEN
    CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (author_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_delete') THEN
    CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (
      author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = posts.group_id AND g.creator_id = auth.uid())
    );
  END IF;

  -- Images : lisibles/gérées si la publication est accessible
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_images' AND policyname='post_images_read') THEN
    CREATE POLICY "post_images_read" ON public.post_images FOR SELECT USING (public.can_see_post(post_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_images' AND policyname='post_images_manage') THEN
    CREATE POLICY "post_images_manage" ON public.post_images FOR ALL USING (
      EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
    );
  END IF;

  -- Likes : lisibles si la publication est accessible ; on ne gère que les siens
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='likes' AND policyname='likes_read') THEN
    CREATE POLICY "likes_read" ON public.likes FOR SELECT USING (public.can_see_post(post_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='likes' AND policyname='likes_insert') THEN
    CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK (
      user_id = auth.uid() AND public.can_see_post(post_id, auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='likes' AND policyname='likes_delete') THEN
    CREATE POLICY "likes_delete" ON public.likes FOR DELETE USING (user_id = auth.uid());
  END IF;

  -- Commentaires : lisibles si la publication est accessible ; suppression de ses propres commentaires
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_read') THEN
    CREATE POLICY "comments_read" ON public.comments FOR SELECT USING (public.can_see_post(post_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_insert') THEN
    CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (
      author_id = auth.uid() AND public.can_see_post(post_id, auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_delete') THEN
    CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (author_id = auth.uid());
  END IF;
END $$;

-- ── Bucket de stockage pour les images de publications (public) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', TRUE)
ON CONFLICT (id) DO NOTHING;
