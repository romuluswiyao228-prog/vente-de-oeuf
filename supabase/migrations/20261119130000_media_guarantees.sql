-- Garanties idempotentes pour la chaîne médias (bucket + politiques + défaut active)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

alter table public.media alter column active set default true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'public read media files'
  ) then
    create policy "public read media files" on storage.objects
      for select using (bucket_id = 'media');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'admin write media files'
  ) then
    create policy "admin write media files" on storage.objects
      for all using (
        bucket_id = 'media' and exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      ) with check (
        bucket_id = 'media' and exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;
