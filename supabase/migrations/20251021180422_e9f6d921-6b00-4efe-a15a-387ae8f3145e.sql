-- Make generated-videos bucket public so users can view their generated videos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-videos';