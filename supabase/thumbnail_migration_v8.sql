-- v8: low-resolution upload variants
-- Run once in Supabase -> SQL Editor.

alter table public.photos
  add column if not exists thumbnail_path text;

alter table public.photos
  add column if not exists preview_path text;

-- Existing rows remain NULL and automatically fall back to storage_path.
-- New uploads will save:
--   storage_path   = original full-resolution image
--   thumbnail_path = ~520 px WebP/JPEG for gallery
--   preview_path   = ~1000 px WebP/JPEG for album cover
