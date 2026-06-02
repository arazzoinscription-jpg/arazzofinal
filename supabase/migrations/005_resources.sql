-- Migration 005 — Bibliothèque de ressources : compteur de téléchargements atomique

CREATE OR REPLACE FUNCTION public.increment_resource_download(rid UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.resources SET download_count = download_count + 1 WHERE id = rid;
$$;
