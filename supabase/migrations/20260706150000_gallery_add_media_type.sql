-- Gallery supports images AND videos. media_type = 'image' | 'video'.
-- image_path stores the object key in the public "gallery" bucket for both.
alter table public.gallery_images
  add column if not exists media_type text not null default 'image';

alter table public.gallery_images
  drop constraint if exists gallery_images_media_type_chk;
alter table public.gallery_images
  add constraint gallery_images_media_type_chk check (media_type in ('image','video'));
