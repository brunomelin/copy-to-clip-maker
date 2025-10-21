-- Make the original-videos bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'original-videos';

-- Allow public access to view videos
CREATE POLICY "Public access to original videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'original-videos');