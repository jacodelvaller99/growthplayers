-- Comunidad como red social: fotos en las publicaciones + cierre de lectura anónima.
-- Idempotente. Se corre en el SQL Editor del dashboard.

-- 1) Foto por publicación. Solo URLs de NUESTRO bucket (nada de píxeles de rastreo externos).
alter table public.community_posts add column if not exists image_url text;
alter table public.community_posts drop constraint if exists community_posts_image_url_check;
alter table public.community_posts add constraint community_posts_image_url_check
  check (image_url is null or image_url like 'https://bizbbtiyftfjufxinwsu.supabase.co/storage/v1/object/public/community-media/%');

-- Una foto sola (sin texto) también es una publicación.
alter table public.community_posts drop constraint if exists community_posts_content_check;
alter table public.community_posts add constraint community_posts_content_check
  check (length(content) > 2 or (image_url is not null and length(content) <= 2000));

-- 2) Bucket de fotos: lectura por URL, subida solo a tu carpeta <user_id>/, 5 MB, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists community_media_insert_own on storage.objects;
create policy community_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists community_media_delete_own on storage.objects;
create policy community_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) «Lo ven solo los miembros»: hoy la llave pública (anon) lee las publicaciones.
--    Políticas RESTRICTIVAS: se suman (AND) a las existentes sin tocarlas.
drop policy if exists community_posts_no_anon on public.community_posts;
create policy community_posts_no_anon on public.community_posts as restrictive for all to anon using (false);
drop policy if exists post_comments_no_anon on public.post_comments;
create policy post_comments_no_anon on public.post_comments as restrictive for all to anon using (false);
drop policy if exists community_reactions_no_anon on public.community_reactions;
create policy community_reactions_no_anon on public.community_reactions as restrictive for all to anon using (false);
