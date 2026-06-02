-- Migration 006 — Recherche globale : passage en "contient" (ILIKE) + ranking similarité

DROP FUNCTION IF EXISTS public.global_search(TEXT);
CREATE OR REPLACE FUNCTION public.global_search(q TEXT)
RETURNS TABLE (kind TEXT, id UUID, label TEXT, link TEXT, score REAL)
LANGUAGE sql STABLE AS $$
  SELECT 'cours'::TEXT, c.id, c.titre_fr, '/formations/'||c.slug, similarity(c.titre_fr, q)
    FROM courses c
    WHERE c.published AND (c.titre_fr ILIKE '%'||q||'%' OR c.titre_ar ILIKE '%'||q||'%')
  UNION ALL
  SELECT 'leçon'::TEXT, l.id, l.titre, '/dashboard/cours/'||l.id::text, similarity(l.titre, q)
    FROM lessons l WHERE l.titre ILIKE '%'||q||'%'
  UNION ALL
  SELECT 'ressource'::TEXT, r.id, r.titre, '#'::TEXT, similarity(r.titre, q)
    FROM resources r WHERE r.titre ILIKE '%'||q||'%'
  UNION ALL
  SELECT 'question'::TEXT, qq.id, qq.titre, '#'::TEXT, similarity(qq.titre, q)
    FROM qa_questions qq WHERE qq.titre ILIKE '%'||q||'%'
  ORDER BY 5 DESC NULLS LAST LIMIT 30;
$$;
