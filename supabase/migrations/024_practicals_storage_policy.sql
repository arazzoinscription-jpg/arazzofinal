-- 024 — Policies Storage pour le bucket 'practicals' (upload direct client authentifié)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='practicals_insert') THEN
    CREATE POLICY "practicals_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'practicals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='practicals_read') THEN
    CREATE POLICY "practicals_read" ON storage.objects FOR SELECT
      USING (bucket_id = 'practicals');
  END IF;
END $$;
