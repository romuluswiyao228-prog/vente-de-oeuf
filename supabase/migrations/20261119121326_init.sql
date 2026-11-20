-- ============================================================
-- La Basse-Cour — Schéma Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- Profils & admin ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);

-- ---------- Textes du site ----------
create table if not exists public.site_texts (
  key text primary key,
  value text not null default ''
);

-- ---------- Médias (bucket Storage : "media", public) ----------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hero_video','story_video','strip_photo','cta_image','logo')),
  url text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Produits ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('oeufs','poules','poussins','canards','materiel')),
  description text not null default '',
  price_fcfa integer not null default 0,
  stock integer not null default 0,
  status text not null default 'actif' check (status in ('actif','archive')),
  featured boolean not null default false,
  images jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------- Livraison ----------
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee_fcfa integer not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- Paiements ----------
create table if not exists public.payment_methods (
  id text primary key, -- 'mobile_money' | 'livraison'
  label text not null,
  details text not null default '',
  active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- Commandes ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  zone text not null default '',
  items jsonb not null default '[]',
  total_fcfa integer not null default 0,
  payment_method text not null default 'mobile_money',
  status text not null default 'nouvelle'
    check (status in ('nouvelle','confirmee','expediee','livree','annulee')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Blog ----------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Fonction admin ----------
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- Auto-création du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.site_texts enable row level security;
alter table public.media enable row level security;
alter table public.products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.blog_posts enable row level security;

-- Lecture publique
create policy "public read texts" on public.site_texts for select using (true);
create policy "public read media" on public.media for select using (active);
create policy "public read products" on public.products for select using (status = 'actif');
create policy "public read zones" on public.delivery_zones for select using (active);
create policy "public read payments" on public.payment_methods for select using (active);
create policy "public read blog" on public.blog_posts for select using (published);
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- Admin : tout gérer
create policy "admin texts" on public.site_texts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin media" on public.media for all using (public.is_admin()) with check (public.is_admin());
create policy "admin products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admin zones" on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());
create policy "admin payments" on public.payment_methods for all using (public.is_admin()) with check (public.is_admin());
create policy "admin orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admin blog" on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media files" on storage.objects
  for select using (bucket_id = 'media');
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

-- ---------- Données initiales ----------
insert into public.site_texts (key, value) values
  ('site_name', 'La Basse-Cour'),
  ('tagline', 'Des œufs à couver, choisis avec le cœur.'),
  ('marquee', 'Fraîchement pondu chez nos éleveurs|Livraison à Lomé et dans tout le Togo|Paiement Mobile Money sécurisé|Envoi soigné|0 % de commission'),
  ('hero_eyebrow', 'EN DIRECT DE LA BASSE-COUR'),
  ('hero_title', 'Des œufs à couver, choisis avec le cœur.'),
  ('hero_subtitle', 'Achetez vos œufs fécondés, poussins et volailles directement, en toute simplicité et en toute confiance.'),
  ('hero_cta_primary', 'Parcourir les œufs'),
  ('hero_cta_secondary', 'Comment ça marche'),
  ('contact_email', 'contact@labassecour.tg'),
  ('contact_phone', '+228 90 00 00 00'),
  ('contact_address', 'Lomé, Togo'),
  ('whatsapp_number', '22890000000'),
  ('social_facebook', ''),
  ('social_instagram', ''),
  ('social_youtube', '')
on conflict (key) do nothing;

insert into public.delivery_zones (name, fee_fcfa, sort_order) values
  ('Lomé', 0, 1),
  ('Autres villes du Togo', 1500, 2)
on conflict do nothing;

insert into public.payment_methods (id, label, details, sort_order) values
  ('mobile_money', 'Mobile Money', 'T-Money, Flooz — paiement sécurisé à la commande', 1),
  ('livraison', 'Paiement à la livraison', 'Réglez en espèces à la réception de votre colis', 2)
on conflict (id) do nothing;

-- Pour créer le compte admin :
-- 1. Créez un utilisateur dans Authentication → Users (ou inscrivez-vous sur /admin)
-- 2. Puis exécutez :
--    update public.profiles set role = 'admin' where id = '<USER_ID>';
