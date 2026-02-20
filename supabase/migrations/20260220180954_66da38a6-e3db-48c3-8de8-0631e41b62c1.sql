
-- Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- Drop old public policies
DROP POLICY IF EXISTS "Public read receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload receipt images" ON storage.objects;

-- Create authenticated, owner-scoped policies
CREATE POLICY "Users can read own receipt images" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own receipt images" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own receipt images" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
