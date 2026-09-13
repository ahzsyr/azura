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

-- Public read for CMS assets served via getPublicUrl()
drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects for select
  using (bucket_id = 'media');

-- Service role uploads (Vercel CMS) bypass RLS; authenticated admins may upload too.
drop policy if exists "media authenticated upload" on storage.objects;
create policy "media authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');
