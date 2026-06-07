-- Supabase Storage bucket for CMS media uploads on Vercel (read-only filesystem).
-- Run once in Supabase → SQL Editor after import-blank.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  67108864,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
    'video/mp4','video/webm',
    'application/pdf','text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
