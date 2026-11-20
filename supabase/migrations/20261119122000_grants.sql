-- Grants nécessaires aux rôles API (RLS continue de filtrer les lignes)
grant usage on schema public to anon, authenticated;

grant select on public.site_texts to anon, authenticated;
grant select on public.media to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant select on public.payment_methods to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

grant insert, update, delete, select on public.products to authenticated;
grant insert, update, delete, select on public.media to authenticated;
grant insert, update, delete, select on public.site_texts to authenticated;
grant insert, update, delete, select on public.delivery_zones to authenticated;
grant insert, update, delete, select on public.payment_methods to authenticated;
grant insert, update, delete, select on public.orders to authenticated;
grant insert, update, delete, select on public.blog_posts to authenticated;
grant insert, update, delete, select on public.profiles to authenticated;
