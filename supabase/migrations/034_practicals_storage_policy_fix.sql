-- 034 — Re-pose proprement les policies Storage du bucket 'practicals'
-- (corrige un blocage RLS constaté à l'upload : « new row violates row-level
-- security policy » malgré la policy 024 — on nettoie et recrée au cas où une
-- règle conflictuelle ou mal posée existerait).

DROP POLICY IF EXISTS "practicals_insert" ON storage.objects;
DROP POLICY IF EXISTS "practicals_read" ON storage.objects;
DROP POLICY IF EXISTS "practicals_update" ON storage.objects;
DROP POLICY IF EXISTS "practicals_delete" ON storage.objects;

CREATE POLICY "practicals_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'practicals');

CREATE POLICY "practicals_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'practicals');

CREATE POLICY "practicals_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'practicals') WITH CHECK (bucket_id = 'practicals');

CREATE POLICY "practicals_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'practicals');
