-- ════════════════════════════════════════════════════════════════════════
-- 051 — Sécurité : RLS sur public.sequence_counters (avertissement Supabase)
-- ────────────────────────────────────────────────────────────────────────
-- `sequence_counters` est une table INTERNE (compteurs des numéros CMD/FACT,
-- migration 011). Elle ne doit jamais être lue/écrite directement via l'API
-- PostgREST. Le linter Supabase signale l'absence de RLS.
--
-- Correctif :
--  1) Activer la RLS SANS aucune policy → aucun accès direct (anon/authenticated).
--  2) Rendre `next_counter` SECURITY DEFINER : les commandes étant insérées par
--     la SESSION de l'utilisateur (voir src/app/actions/orders.ts), le trigger
--     `set_order_number` appelle `next_counter` avec les droits de l'utilisateur.
--     En SECURITY DEFINER (droits du propriétaire), la fonction contourne la RLS
--     et peut toujours incrémenter le compteur → la génération des numéros de
--     commande/facture continue de fonctionner.
-- Additif et non destructif : la logique de numérotation est identique.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;
-- Aucune policy : accès réservé aux fonctions SECURITY DEFINER (triggers).

CREATE OR REPLACE FUNCTION public.next_counter(p_kind TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year  INT := EXTRACT(YEAR FROM NOW())::INT;
  v_value INT;
BEGIN
  INSERT INTO public.sequence_counters (kind, year, last_value)
  VALUES (p_kind, v_year, 1)
  ON CONFLICT (kind, year)
  DO UPDATE SET last_value = public.sequence_counters.last_value + 1
  RETURNING last_value INTO v_value;
  RETURN v_value;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 051_secure_sequence_counters
-- ════════════════════════════════════════════════════════════════════════
