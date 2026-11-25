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
  race text not null default '',
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
  payment_status text not null default 'non_paye'
    check (payment_status in ('non_paye','paye')),
  payment_ref text,
  paid_at timestamptz,
  status text not null default 'nouvelle'
    check (status in ('nouvelle','confirmee','expediee','livree','annulee')),
  note text not null default '',
  reference text,
  fulfillment text not null default 'livraison',
  subtotal_fcfa integer not null default 0,
  delivery_fee_fcfa integer not null default 0,
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

-- Le premier compte inscrit devient admin (security definer pour
-- contourner la RLS qui masquerait le comptage des admins).
create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    return false;
  end if;
  update public.profiles set role = 'admin' where id = auth.uid();
  return found;
end $$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;

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
  ('marquee', 'Fraîchement pondu|Livraison à Lomé et dans tout le Togo|Paiement Mobile Money sécurisé|Envoi soigné|Retrait sur place possible'),
  ('hero_eyebrow', 'EN DIRECT DE LA BASSE-COUR'),
  ('hero_title', 'Des œufs à couver, choisis avec le cœur.'),
  ('hero_subtitle', 'Achetez vos œufs fécondés, poussins et volailles directement, en toute simplicité et en toute confiance.'),
  ('hero_cta_primary', 'Parcourir les œufs'),
  ('hero_cta_secondary', 'Comment ça marche'),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('contact_address', 'Lomé, Togo'),
  ('whatsapp_number', ''),
  ('whatsapp_order_note', 'Merci d''indiquer votre quartier et le mode de paiement souhaité.'),
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

-- ---------- Création de commande (prix/stock recalculés en base) ----------
create or replace function public.create_order(
  p_customer_name text,
  p_phone text,
  p_email text default '',
  p_fulfillment text default 'livraison',
  p_zone_id uuid default null,
  p_address text default '',
  p_payment_method text default '',
  p_note text default '',
  p_items jsonb default '[]'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_subtotal int := 0;
  v_fee int := 0;
  v_zone_name text := '';
  v_items jsonb := '[]'::jsonb;
  v_total int;
  v_order_id uuid;
  v_reference text;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Nom du client manquant';
  end if;
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'Numéro de téléphone manquant';
  end if;
  if p_fulfillment not in ('livraison', 'retrait') then
    raise exception 'Mode de réception invalide';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier est vide';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'Quantité invalide';
    end;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantité invalide';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and status = 'actif';

    if not found then
      raise exception 'Un produit du panier est introuvable ou indisponible';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuffisant pour « % » (disponible : %)', v_product.name, v_product.stock;
    end if;

    v_subtotal := v_subtotal + v_product.price_fcfa * v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'price_fcfa', v_product.price_fcfa
    );
  end loop;

  if p_fulfillment = 'livraison' then
    if p_zone_id is null then
      raise exception 'Zone de livraison manquante';
    end if;
    if p_address is null or btrim(p_address) = '' then
      raise exception 'Adresse manquante';
    end if;
    select name, fee_fcfa into v_zone_name, v_fee
    from public.delivery_zones
    where id = p_zone_id and active;
    if not found then
      raise exception 'Zone de livraison invalide';
    end if;
  else
    v_zone_name := 'Retrait sur place';
  end if;

  v_total := v_subtotal + v_fee;

  insert into public.orders (
    customer_name, phone, email, address, zone,
    items, total_fcfa, payment_method, status, note,
    reference, fulfillment, subtotal_fcfa, delivery_fee_fcfa
  ) values (
    btrim(p_customer_name), btrim(p_phone), coalesce(p_email, ''),
    coalesce(p_address, ''), v_zone_name,
    v_items, v_total, coalesce(p_payment_method, ''), 'nouvelle', coalesce(p_note, ''),
    '', p_fulfillment, v_subtotal, v_fee
  )
  returning id into v_order_id;

  v_reference := upper(left(v_order_id::text, 8));
  update public.orders set reference = v_reference where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'reference', v_reference,
    'subtotal_fcfa', v_subtotal,
    'delivery_fee_fcfa', v_fee,
    'total_fcfa', v_total,
    'fulfillment', p_fulfillment,
    'zone', v_zone_name,
    'items', v_items
  );
end $$;

revoke all on function public.create_order(text, text, text, text, uuid, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, uuid, text, text, text, jsonb) to anon, authenticated;

-- ---------- Médias : garanties idempotentes ----------
-- (les éléments ci-dessus existent déjà ; ce bloc les re-vérifie sans rien casser)
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

-- Pour créer le compte admin :
-- 1. Créez un utilisateur dans Authentication → Users (ou inscrivez-vous sur /admin)
-- 2. Puis exécutez :
--    update public.profiles set role = 'admin' where id = '<USER_ID>';

-- ============================================================
-- Section Ferme (admin uniquement) — voir migration
-- 20261122120000_farm.sql ; bloc identique ci-dessous.
-- ============================================================
create table if not exists public.farm_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null default '',
  breed text not null default '',
  kind text not null default 'autre'
    check (kind in ('pondeuses','reproducteurs','poussins','autre')),
  arrived_on date,
  initial_count int not null default 0,
  status text not null default 'actif' check (status in ('actif','terminee')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.farm_batch_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.farm_batches(id) on delete cascade,
  date date not null,
  type text not null
    check (type in ('arrivee','mortalite','vente','transfert','ajustement')),
  qty int not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create or replace view public.farm_batches_view as
select
  b.*,
  b.initial_count + coalesce(sum(e.qty), 0) as effectif_actuel
from public.farm_batches b
left join public.farm_batch_events e on e.batch_id = b.id
group by b.id;
alter view public.farm_batches_view set (security_invoker = true);

create table if not exists public.egg_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind text not null
    check (kind in ('ponte','casse','incubation','perte','transfert_boutique','ajustement')),
  qty_eggs int not null,
  batch_id uuid references public.farm_batches(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.incubations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.farm_batches(id) on delete set null,
  started_on date not null,
  eggs_set int not null,
  incubation_days int not null default 21,
  expected_hatch_on date generated always as (started_on + incubation_days) stored,
  hatched_count int,
  status text not null default 'en_cours' check (status in ('en_cours','terminee')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.farm_supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'aliment'
    check (category in ('aliment','medicament','vaccin','materiel')),
  unit text not null default 'unité',
  alert_threshold numeric,
  expiry_date date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.farm_supplies(id) on delete cascade,
  date date not null,
  qty numeric not null,
  unit_cost numeric,
  note text not null default '',
  created_at timestamptz not null default now()
);

create or replace view public.farm_supplies_view as
select
  s.*,
  coalesce(sum(m.qty), 0) as stock
from public.farm_supplies s
left join public.supply_movements m on m.supply_id = s.id
group by s.id;
alter view public.farm_supplies_view set (security_invoker = true);

create table if not exists public.farm_expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null default 'autre'
    check (category in ('aliment','soins','main_oeuvre','transport','autre')),
  amount int not null,
  note text not null default '',
  supply_id uuid references public.farm_supplies(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.farm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date not null,
  done boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

insert into public.site_texts (key, value)
values ('eggs_per_tray', '30')
on conflict (key) do nothing;

-- Grants API : sans eux, authenticated reçoit « permission denied »
-- (la RLS « admin only » continue de filtrer les lignes).
grant select, insert, update, delete on public.farm_batches to authenticated;
grant select, insert, update, delete on public.farm_batch_events to authenticated;
grant select, insert, update, delete on public.egg_movements to authenticated;
grant select, insert, update, delete on public.incubations to authenticated;
grant select, insert, update, delete on public.farm_supplies to authenticated;
grant select, insert, update, delete on public.supply_movements to authenticated;
grant select, insert, update, delete on public.farm_expenses to authenticated;
grant select, insert, update, delete on public.farm_tasks to authenticated;
grant select on public.farm_batches_view to authenticated;
grant select on public.farm_supplies_view to authenticated;

alter table public.farm_batches enable row level security;
alter table public.farm_batch_events enable row level security;
alter table public.egg_movements enable row level security;
alter table public.incubations enable row level security;
alter table public.farm_supplies enable row level security;
alter table public.supply_movements enable row level security;
alter table public.farm_expenses enable row level security;
alter table public.farm_tasks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'farm_batches','farm_batch_events','egg_movements','incubations',
    'farm_supplies','supply_movements','farm_expenses','farm_tasks'
  ] loop
    execute format('drop policy if exists "admin only %I" on public.%I', t, t);
    execute format(
      'create policy "admin only %I" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end $$;

create or replace function public.farm_transfer_eggs(
  p_product_id uuid, p_eggs int, p_date date, p_note text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tray int; v_trays int; v_reserve int; v_product record;
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs'; end if;
  if p_eggs is null or p_eggs <= 0 then raise exception 'Nombre d''œufs invalide'; end if;
  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;
  if p_eggs % v_tray <> 0 then
    raise exception 'Le nombre d''œufs doit être un multiple de % (un plateau)', v_tray;
  end if;
  v_trays := p_eggs / v_tray;
  select coalesce(sum(qty_eggs), 0) into v_reserve from public.egg_movements;
  if v_reserve < p_eggs then
    raise exception 'Réserve insuffisante : % œufs demandés, % en réserve', p_eggs, v_reserve;
  end if;
  select id, type into v_product from public.products where id = p_product_id;
  if not found then raise exception 'Produit introuvable'; end if;
  if v_product.type <> 'oeufs' then
    raise exception 'Seuls les produits de type Œufs peuvent recevoir des œufs';
  end if;
  insert into public.egg_movements (date, kind, qty_eggs, product_id, note)
  values (coalesce(p_date, current_date), 'transfert_boutique', -p_eggs, p_product_id, coalesce(p_note, ''));
  update public.products set stock = stock + v_trays where id = p_product_id;
  return jsonb_build_object('trays', v_trays, 'eggs', p_eggs);
end $$;

create or replace function public.farm_start_incubation(
  p_batch_id uuid, p_started_on date, p_eggs_set int, p_days int, p_note text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_days int;
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs'; end if;
  if p_eggs_set is null or p_eggs_set <= 0 then raise exception 'Nombre d''œufs à couver invalide'; end if;
  v_days := coalesce(p_days, 21);
  if v_days < 1 or v_days > 90 then raise exception 'Durée d''incubation invalide'; end if;
  if p_batch_id is not null and not exists (select 1 from public.farm_batches where id = p_batch_id) then
    raise exception 'Lot introuvable';
  end if;
  insert into public.incubations (batch_id, started_on, eggs_set, incubation_days, note)
  values (p_batch_id, coalesce(p_started_on, current_date), p_eggs_set, v_days, coalesce(p_note, ''))
  returning id into v_id;
  insert into public.egg_movements (date, kind, qty_eggs, batch_id, note)
  values (coalesce(p_started_on, current_date), 'incubation', -p_eggs_set, p_batch_id, coalesce(p_note, ''));
  return v_id;
end $$;

create or replace function public.farm_finish_incubation(
  p_id uuid, p_hatched_count int, p_create_batch boolean, p_batch_name text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inc public.incubations%rowtype;
  v_batch_id uuid; v_name text;
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs'; end if;
  select * into v_inc from public.incubations where id = p_id;
  if not found then raise exception 'Incubation introuvable'; end if;
  if v_inc.status <> 'en_cours' then raise exception 'Cette incubation est déjà clôturée'; end if;
  update public.incubations
  set status = 'terminee', hatched_count = greatest(0, coalesce(p_hatched_count, 0))
  where id = p_id;
  if p_create_batch and coalesce(p_hatched_count, 0) > 0 then
    v_name := nullif(btrim(p_batch_name), '');
    if v_name is null then
      v_name := 'Poussins ' || to_char(coalesce(v_inc.expected_hatch_on, current_date), 'DD/MM/YYYY');
    end if;
    insert into public.farm_batches (name, species, breed, kind, arrived_on, initial_count, status, note)
    values (
      v_name, '', '', 'poussins',
      coalesce(v_inc.expected_hatch_on, current_date),
      greatest(0, p_hatched_count), 'actif',
      'Issu de l''incubation du ' || to_char(v_inc.started_on, 'DD/MM/YYYY')
    )
    returning id into v_batch_id;
  end if;
  return jsonb_build_object(
    'incubation_id', p_id,
    'batch_id', v_batch_id,
    'hatched_count', greatest(0, coalesce(p_hatched_count, 0))
  );
end $$;

revoke all on function public.farm_transfer_eggs(uuid, int, date, text) from public;
revoke all on function public.farm_start_incubation(uuid, date, int, int, text) from public;
revoke all on function public.farm_finish_incubation(uuid, int, boolean, text) from public;
grant execute on function public.farm_transfer_eggs(uuid, int, date, text) to authenticated;
grant execute on function public.farm_start_incubation(uuid, date, int, int, text) to authenticated;
grant execute on function public.farm_finish_incubation(uuid, int, boolean, text) to authenticated;

-- ============================================================
-- Tableau de bord admin — voir migration 20261123120000_dashboard.sql
-- ============================================================
-- ============================================================
-- Tableau de bord admin : séries, synthèse, tops — calculés en base,
-- réservés aux admins (is_admin()). Aucune table ajoutée.
-- ============================================================

-- La colonne orders.payment_status peut ne pas encore exister :
-- on la détecte pour rester compatible avant/après la migration paiements.
create or replace function public.dashboard_has_payment_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'payment_status'
  )
$$;

-- Filtre « ventes » : commandes non annulées payées ou livrées ;
-- sans la colonne payment_status, toutes les commandes non annulées.
create or replace function public.dashboard_sales_filter()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.dashboard_has_payment_status() then
    return 'status <> ''annulee'' and (payment_status = ''paye'' or status = ''livree'')';
  end if;
  return 'status <> ''annulee''';
end $$;

-- Série temporelle : metric ∈ ventes|commandes|ponte|depenses|benefice
-- period ∈ 7j|30j|12m ; offset 0 = période actuelle, 1 = précédente.
create or replace function public.dashboard_series(
  p_metric text,
  p_period text,
  p_offset int default 0
)
returns table(label text, valeur numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_start date;
  v_end date;
  v_monthly boolean := false;
  v_sales_where text;
  v_ventes_src text;
  v_dep_src text;
  v_src text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  p_offset := greatest(0, coalesce(p_offset, 0));
  v_sales_where := public.dashboard_sales_filter();

  if p_period = '12m' then
    v_monthly := true;
    v_start := (date_trunc('month', current_date) - ((11 + 12 * p_offset) || ' months')::interval)::date;
    v_end := (date_trunc('month', current_date) - (12 * p_offset || ' months')::interval)::date;
  elsif p_period in ('7j', '30j') then
    v_n := case p_period when '7j' then 7 else 30 end;
    v_end := current_date - (v_n * p_offset);
    v_start := v_end - (v_n - 1);
  else
    raise exception 'Période invalide (7j, 30j ou 12m)';
  end if;

  -- Sous-requêtes sources produisant (d date, val numeric) par jour
  v_ventes_src := format(
    'select (created_at at time zone ''UTC'')::date as d, sum(total_fcfa)::numeric as val from public.orders where %s group by 1',
    v_sales_where
  );
  v_dep_src := 'select date as d, sum(amount)::numeric as val from public.farm_expenses group by 1';

  if p_metric = 'ventes' then
    v_src := v_ventes_src;
  elsif p_metric = 'commandes' then
    v_src := 'select (created_at at time zone ''UTC'')::date as d, count(*)::numeric as val from public.orders where status <> ''annulee'' group by 1';
  elsif p_metric = 'ponte' then
    v_src := 'select date as d, sum(qty_eggs)::numeric as val from public.egg_movements where kind = ''ponte'' group by 1';
  elsif p_metric = 'depenses' then
    v_src := v_dep_src;
  elsif p_metric = 'benefice' then
    v_src := format(
      'select coalesce(v.d, x.d) as d, coalesce(v.val, 0) - coalesce(x.val, 0) as val from (%s) v full join (%s) x on x.d = v.d',
      v_ventes_src, v_dep_src
    );
  else
    raise exception 'Métrique invalide (ventes, commandes, ponte, depenses, benefice)';
  end if;

  if v_monthly then
    return query execute format($q$
      select to_char(gs.d, 'MM/YYYY'), coalesce(sum(s.val), 0)::numeric
      from generate_series(%L::date, %L::date, interval '1 month') as gs(d)
      left join (
        select date_trunc('month', d)::date as d, sum(val)::numeric as val
        from (%s) t group by 1
      ) s on s.d = gs.d::date
      group by gs.d order by gs.d
    $q$, v_start, v_end, v_src);
  else
    return query execute format($q$
      select to_char(gs.d, 'DD/MM'), coalesce(sum(s.val), 0)::numeric
      from generate_series(%L::date, %L::date, interval '1 day') as gs(d)
      left join (%s) s on s.d = gs.d::date
      group by gs.d order by gs.d
    $q$, v_start, v_end, v_src);
  end if;
end $$;

-- Synthèse pour les compteurs (jsonb)
create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sales_where text;
  v_ventes_jour numeric;
  v_commandes_jour bigint;
  v_ventes_mois numeric;
  v_depenses_mois numeric;
  v_a_encaisser numeric;
  v_tray int;
  v_reserve bigint;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  v_sales_where := public.dashboard_sales_filter();

  execute format($q$
    select
      coalesce(sum(total_fcfa) filter (
        where (created_at at time zone 'UTC')::date = current_date and %s), 0),
      count(*) filter (
        where (created_at at time zone 'UTC')::date = current_date and status <> 'annulee'),
      coalesce(sum(total_fcfa) filter (
        where date_trunc('month', created_at at time zone 'UTC') = date_trunc('month', current_date)
          and %s), 0)
    from public.orders
  $q$, v_sales_where, v_sales_where)
  into v_ventes_jour, v_commandes_jour, v_ventes_mois;

  select coalesce(sum(amount), 0) into v_depenses_mois
  from public.farm_expenses
  where date_trunc('month', date) = date_trunc('month', current_date);

  if public.dashboard_has_payment_status() then
    execute $q$
      select coalesce(sum(total_fcfa), 0) into strict v_a_encaisser
      from public.orders
      where status <> 'annulee' and payment_status = 'non_paye'
    $q$;
  else
    v_a_encaisser := null;
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);

  select coalesce(sum(qty_eggs), 0) into v_reserve from public.egg_movements;

  return jsonb_build_object(
    'ventes_jour', v_ventes_jour,
    'commandes_jour', v_commandes_jour,
    'stock_boutique_trays', coalesce((
      select sum(stock) from public.products where type = 'oeufs'
    ), 0),
    'reserve_oeufs', v_reserve,
    'eggs_per_tray', v_tray,
    'benefice_mois', v_ventes_mois - v_depenses_mois,
    'ventes_mois', v_ventes_mois,
    'depenses_mois', v_depenses_mois,
    'a_encaisser', v_a_encaisser
  );
end $$;

-- Produits les plus vendus sur la période (offset 0)
create or replace function public.dashboard_top_products(p_period text)
returns table(name text, quantite numeric, montant numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_pay_filter text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  v_pay_filter := case
    when public.dashboard_has_payment_status()
      then 'and (o.payment_status = ''paye'' or o.status = ''livree'')'
    else ''
  end;

  if p_period = '12m' then
    v_start := date_trunc('month', current_date) - interval '11 months';
  elsif p_period = '30j' then
    v_start := current_date - interval '29 days';
  else
    v_start := current_date - interval '6 days';
  end if;

  return query execute format($q$
    select it->>'name' as name,
           sum((it->>'quantity')::numeric) as quantite,
           sum((it->>'price_fcfa')::numeric * (it->>'quantity')::numeric) as montant
    from public.orders o
    cross join lateral jsonb_array_elements(o.items) it
    where o.created_at >= %L::timestamptz
      and o.status <> 'annulee'
      %s
    group by it->>'name'
    order by quantite desc
    limit 8
  $q$, v_start, v_pay_filter);
end $$;

-- Dépenses par catégorie sur la période
create or replace function public.dashboard_expenses_by_category(p_period text)
returns table(categorie text, montant numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  if p_period = '12m' then
    v_start := (date_trunc('month', current_date) - interval '11 months')::date;
  elsif p_period = '30j' then
    v_start := current_date - 29;
  else
    v_start := current_date - 6;
  end if;

  return query
    select category as categorie, sum(amount)::numeric as montant
    from public.farm_expenses
    where date >= v_start
    group by category
    order by montant desc;
end $$;

revoke all on function public.dashboard_has_payment_status() from public;
revoke all on function public.dashboard_sales_filter() from public;
revoke all on function public.dashboard_series(text, text, int) from public;
revoke all on function public.dashboard_summary() from public;
revoke all on function public.dashboard_top_products(text) from public;
revoke all on function public.dashboard_expenses_by_category(text) from public;
grant execute on function public.dashboard_has_payment_status() to authenticated;
grant execute on function public.dashboard_sales_filter() to authenticated;
grant execute on function public.dashboard_series(text, text, int) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;
grant execute on function public.dashboard_top_products(text) to authenticated;
grant execute on function public.dashboard_expenses_by_category(text) to authenticated;

-- ============================================================
-- Ferme v2.1 : bandes (couleur d'œufs, couleur d'affichage,
-- calibre), prix par bande et canal, événements datés, saisie
-- de production par bande, sorties de stock (vente/don).
-- Idempotent : aucune donnée ni fonction existante modifiée
-- (seuls des ajouts : colonnes, tables, fonction, contrainte
-- de egg_movements.kind élargie sans toucher aux lignes).
-- ============================================================

-- ---------- Bandes : attributs œufs ----------
alter table public.farm_batches
  add column if not exists egg_color text not null default ''
    check (egg_color in ('', 'roux', 'blanc'));
alter table public.farm_batches
  add column if not exists display_color text not null default '';
alter table public.farm_batches
  add column if not exists caliber text not null default ''
    check (caliber in ('', 'petit', 'moyen', 'gros'));

-- ---------- Mouvements d'œufs : + vente et don ----------
-- On supprime puis recrée la contrainte sur kind : les lignes
-- existantes ne sont pas touchées, seuls les kinds 'vente' et
-- 'don' deviennent acceptés.
alter table public.egg_movements
  drop constraint if exists egg_movements_kind_check;
alter table public.egg_movements
  add constraint egg_movements_kind_check
  check (kind in ('ponte','casse','incubation','perte','transfert_boutique','ajustement','vente','don'));

-- ---------- Prix par bande et canal ----------
create table if not exists public.batch_prices (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.farm_batches(id) on delete cascade,
  channel text not null default 'ferme'
    check (channel in ('ferme','boutique')),
  price_fcfa int not null check (price_fcfa >= 0),
  effective_from date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists batch_prices_lookup
  on public.batch_prices (batch_id, channel, effective_from desc);

-- ---------- Dépenses : rattachement facultatif à une bande ----------
alter table public.farm_expenses
  add column if not exists batch_id uuid
    references public.farm_batches(id) on delete set null;
create index if not exists farm_expenses_batch
  on public.farm_expenses (batch_id);

-- ---------- Événements datés de la ferme ----------
create table if not exists public.farm_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  batch_id uuid references public.farm_batches(id) on delete set null,
  title text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists farm_events_date on public.farm_events (date desc);

-- ---------- Saisie de la production du jour par bande ----------
-- Atomique et réservée aux admins : supprime les mouvements
-- ponte/casse existants de cette bande à cette date (pas de
-- doublon si on ressaisit), puis crée :
--   - un mouvement 'ponte' de (sains + cassés) œufs
--   - un mouvement 'casse' de -cassés œufs (si cassés > 0)
-- Le stock d'une bande = somme de ses mouvements = œufs sains.
create or replace function public.farm_record_production(
  p_date date,
  p_batch_id uuid,
  p_plateaux int,
  p_oeufs int,
  p_casses int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_sains int;
  v_total int;
  v_date date;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_batch_id is null then
    raise exception 'Bande obligatoire';
  end if;
  if not exists (select 1 from public.farm_batches where id = p_batch_id) then
    raise exception 'Bande introuvable';
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  if coalesce(p_plateaux, 0) < 0 or coalesce(p_casses, 0) < 0 then
    raise exception 'Les quantités ne peuvent pas être négatives';
  end if;
  if p_oeufs is null or p_oeufs < 0 or p_oeufs >= v_tray then
    raise exception 'Œufs détachés : valeur entre 0 et %', v_tray - 1;
  end if;

  v_sains := coalesce(p_plateaux, 0) * v_tray + p_oeufs;
  v_total := v_sains + coalesce(p_casses, 0);
  v_date := coalesce(p_date, current_date);

  -- Remplace les saisies précédentes de cette bande à cette date.
  delete from public.egg_movements
  where batch_id = p_batch_id
    and date = v_date
    and kind in ('ponte', 'casse');

  if v_total > 0 then
    insert into public.egg_movements (date, kind, qty_eggs, batch_id, note)
    values (v_date, 'ponte', v_total, p_batch_id, 'Saisie production');
  end if;
  if coalesce(p_casses, 0) > 0 then
    insert into public.egg_movements (date, kind, qty_eggs, batch_id, note)
    values (v_date, 'casse', -p_casses, p_batch_id, 'Saisie production');
  end if;

  return jsonb_build_object(
    'sains', v_sains,
    'casses', coalesce(p_casses, 0),
    'production', v_total
  );
end $$;

-- ---------- RLS : nouvelles tables réservées aux admins ----------
alter table public.batch_prices enable row level security;
alter table public.farm_events enable row level security;

drop policy if exists "admin only batch_prices" on public.batch_prices;
create policy "admin only batch_prices" on public.batch_prices
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only farm_events" on public.farm_events;
create policy "admin only farm_events" on public.farm_events
  for all using (public.is_admin()) with check (public.is_admin());

-- farm_expenses et farm_batches ont déjà leurs policies « admin only ».

-- ---------- Grants API (la RLS filtre ensuite les lignes) ----------
grant select, insert, update, delete on public.batch_prices to authenticated;
grant select, insert, update, delete on public.farm_events to authenticated;

revoke all on function public.farm_record_production(date, uuid, int, int, int) from public;
grant execute on function public.farm_record_production(date, uuid, int, int, int) to authenticated;

-- Recharge du cache de schéma PostgREST.
notify pgrst, 'reload schema';

-- ============================================================
-- Ferme v2.2 : clients, ventes en gros (ferme/boutique),
-- encaissements et répartition sur les ventes impayées.
-- Idempotent : ajouts uniquement, aucune fonction ni donnée
-- existante modifiée.
-- ============================================================

-- ---------- Clients ----------
create table if not exists public.farm_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  type text not null default 'particulier'
    check (type in ('revendeur','boutique','particulier')),
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Ventes et lignes ----------
create table if not exists public.farm_sales (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  client_id uuid references public.farm_clients(id) on delete set null,
  channel text not null default 'ferme'
    check (channel in ('ferme','boutique')),
  paid_amount int not null default 0 check (paid_amount >= 0),
  total_fcfa int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists farm_sales_date on public.farm_sales (date desc);
create index if not exists farm_sales_client on public.farm_sales (client_id);

create table if not exists public.farm_sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.farm_sales(id) on delete cascade,
  batch_id uuid not null references public.farm_batches(id),
  plateaux int not null default 0 check (plateaux >= 0),
  oeufs int not null default 0 check (oeufs >= 0),
  unit_price int not null default 0 check (unit_price >= 0)
);
create index if not exists farm_sale_lines_sale on public.farm_sale_lines (sale_id);
create index if not exists farm_sale_lines_batch on public.farm_sale_lines (batch_id);

-- ---------- Encaissements clients ----------
create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.farm_clients(id) on delete cascade,
  date date not null,
  amount int not null check (amount > 0),
  method text not null default 'especes'
    check (method in ('especes','mobile_money','autre')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists client_payments_client on public.client_payments (client_id, date);

-- Lien vente -> mouvements de stock (les mouvements 'vente' créés
-- par farm_create_sale référencent leur vente ; suppressible).
alter table public.egg_movements
  add column if not exists sale_id uuid
    references public.farm_sales(id) on delete set null;
create index if not exists egg_movements_sale on public.egg_movements (sale_id);

-- ---------- RLS : réservées aux admins ----------
alter table public.farm_clients enable row level security;
alter table public.farm_sales enable row level security;
alter table public.farm_sale_lines enable row level security;
alter table public.client_payments enable row level security;

drop policy if exists "admin only farm_clients" on public.farm_clients;
create policy "admin only farm_clients" on public.farm_clients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only farm_sales" on public.farm_sales;
create policy "admin only farm_sales" on public.farm_sales
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only farm_sale_lines" on public.farm_sale_lines;
create policy "admin only farm_sale_lines" on public.farm_sale_lines
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only client_payments" on public.client_payments;
create policy "admin only client_payments" on public.client_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Grants API ----------
grant select, insert, update, delete on public.farm_clients to authenticated;
grant select, insert, update, delete on public.farm_sales to authenticated;
grant select, insert, update, delete on public.farm_sale_lines to authenticated;
grant select, insert, update, delete on public.client_payments to authenticated;

-- ============================================================
-- Fonctions atomiques (admins uniquement)
-- ============================================================

-- Œufs vendus pour une ligne : plateaux * oeufs_par_plateau + détachés.
create or replace function public.farm_line_eggs(p_plateaux int, p_oeufs int, p_tray int)
returns int
language sql
immutable
as $$
  select coalesce(p_plateaux, 0) * p_tray + coalesce(p_oeufs, 0)
$$;

-- Montant d'une ligne : prix par plateau pour les plateaux,
-- les œufs détachés au prorata (arrondi au FCFA supérieur).
create or replace function public.farm_line_amount(
  p_plateaux int, p_oeufs int, p_unit_price int, p_tray int
)
returns int
language sql
immutable
as $$
  select coalesce(p_plateaux, 0) * coalesce(p_unit_price, 0)
       + case when coalesce(p_oeufs, 0) > 0 and p_tray > 0
              then ceil(coalesce(p_unit_price, 0)::numeric * p_oeufs / p_tray)::int
              else 0 end
$$;

-- Crée une vente et ses lignes, puis un mouvement 'vente' par ligne.
-- p_lines : jsonb [{"batch_id","plateaux","oeufs","unit_price"}]
-- Refuse si le stock d'une bande est insuffisant, sauf p_force.
create or replace function public.farm_create_sale(
  p_date date,
  p_client_id uuid,
  p_channel text,
  p_paid_amount int,
  p_note text,
  p_lines jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_sale_id uuid;
  v_line jsonb;
  v_batch_id uuid;
  v_plateaux int;
  v_oeufs int;
  v_price int;
  v_eggs int;
  v_stock int;
  v_total int := 0;
  v_paid int;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_channel not in ('ferme','boutique') then
    raise exception 'Canal invalide (ferme ou boutique)';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Ajoute au moins une ligne de vente';
  end if;
  if p_client_id is not null then
    select name into v_name from public.farm_clients where id = p_client_id;
    if not found then
      raise exception 'Client introuvable';
    end if;
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  v_paid := greatest(0, coalesce(p_paid_amount, 0));

  -- Validation de toutes les lignes avant toute écriture.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    if v_plateaux < 0 or v_oeufs < 0 or v_price < 0 then
      raise exception 'Quantités ou prix invalides dans une ligne';
    end if;
    if v_oeufs >= v_tray then
      raise exception 'Œufs détachés : entre 0 et % par ligne', v_tray - 1;
    end if;
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);
    if v_eggs <= 0 then
      raise exception 'Chaque ligne doit contenir au moins un œuf';
    end if;
    if not exists (select 1 from public.farm_batches where id = v_batch_id) then
      raise exception 'Bande introuvable dans une ligne';
    end if;
    if not p_force then
      select coalesce(sum(qty_eggs), 0) into v_stock
      from public.egg_movements where batch_id = v_batch_id;
      if v_stock < v_eggs then
        select name into v_name from public.farm_batches where id = v_batch_id;
        raise exception 'Stock insuffisant pour la bande % : % œufs demandés, % en stock',
          coalesce(v_name, 'inconnue'), v_eggs, v_stock;
      end if;
    end if;
    v_total := v_total + public.farm_line_amount(v_plateaux, v_oeufs, v_price, v_tray);
  end loop;

  if v_paid > v_total then
    raise exception 'Le montant payé (%) dépasse le total de la vente (%)', v_paid, v_total;
  end if;

  insert into public.farm_sales (date, client_id, channel, paid_amount, total_fcfa, note)
  values (coalesce(p_date, current_date), p_client_id, p_channel, v_paid, v_total, coalesce(p_note, ''))
  returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);

    insert into public.farm_sale_lines (sale_id, batch_id, plateaux, oeufs, unit_price)
    values (v_sale_id, v_batch_id, v_plateaux, v_oeufs, v_price);

    insert into public.egg_movements (date, kind, qty_eggs, batch_id, sale_id, note)
    values (
      coalesce(p_date, current_date), 'vente', -v_eggs, v_batch_id, v_sale_id,
      'Vente ' || coalesce(p_channel, 'ferme')
    );
  end loop;

  return jsonb_build_object('sale_id', v_sale_id, 'total_fcfa', v_total);
end $$;

-- Modifie une vente : supprime ses lignes et mouvements 'vente',
-- puis recrée le tout avec les nouvelles valeurs.
create or replace function public.farm_update_sale(
  p_sale_id uuid,
  p_date date,
  p_client_id uuid,
  p_channel text,
  p_paid_amount int,
  p_note text,
  p_lines jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.farm_sales%rowtype;
  v_tray int;
  v_line jsonb;
  v_batch_id uuid;
  v_plateaux int;
  v_oeufs int;
  v_price int;
  v_eggs int;
  v_stock int;
  v_total int := 0;
  v_paid int;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select * into v_sale from public.farm_sales where id = p_sale_id;
  if not found then
    raise exception 'Vente introuvable';
  end if;

  -- Les encaissements sont rattachés au client, pas à la vente :
  -- paid_amount peut être ajusté librement par l'admin.
  v_paid := greatest(0, coalesce(p_paid_amount, 0));

  -- On réutilise la validation de farm_create_sale en supprimant
  -- d'abord lignes et mouvements de l'ancienne version.
  delete from public.egg_movements where sale_id = p_sale_id and kind = 'vente';
  delete from public.farm_sale_lines where sale_id = p_sale_id;

  -- Validation identique à farm_create_sale, puis réinsertion.
  -- (Duplication volontaire : pas d'appel imbriqué pour garder
  -- les erreurs explicites.)
  if p_channel not in ('ferme','boutique') then
    raise exception 'Canal invalide (ferme ou boutique)';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Ajoute au moins une ligne de vente';
  end if;
  if p_client_id is not null then
    select name into v_name from public.farm_clients where id = p_client_id;
    if not found then
      raise exception 'Client introuvable';
    end if;
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    if v_plateaux < 0 or v_oeufs < 0 or v_price < 0 then
      raise exception 'Quantités ou prix invalides dans une ligne';
    end if;
    if v_oeufs >= v_tray then
      raise exception 'Œufs détachés : entre 0 et % par ligne', v_tray - 1;
    end if;
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);
    if v_eggs <= 0 then
      raise exception 'Chaque ligne doit contenir au moins un œuf';
    end if;
    if not exists (select 1 from public.farm_batches where id = v_batch_id) then
      raise exception 'Bande introuvable dans une ligne';
    end if;
    if not p_force then
      -- Le stock à revérifier exclut les œufs de cette vente
      -- (ses mouvements viennent d'être supprimés).
      select coalesce(sum(qty_eggs), 0) into v_stock
      from public.egg_movements where batch_id = v_batch_id;
      if v_stock < v_eggs then
        select name into v_name from public.farm_batches where id = v_batch_id;
        raise exception 'Stock insuffisant pour la bande % : % œufs demandés, % en stock',
          coalesce(v_name, 'inconnue'), v_eggs, v_stock;
      end if;
    end if;
    v_total := v_total + public.farm_line_amount(v_plateaux, v_oeufs, v_price, v_tray);
  end loop;

  if v_paid > v_total then
    raise exception 'Le montant payé (%) dépasse le total de la vente (%)', v_paid, v_total;
  end if;

  update public.farm_sales
  set date = coalesce(p_date, v_sale.date),
      client_id = p_client_id,
      channel = p_channel,
      paid_amount = v_paid,
      total_fcfa = v_total,
      note = coalesce(p_note, '')
  where id = p_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);

    insert into public.farm_sale_lines (sale_id, batch_id, plateaux, oeufs, unit_price)
    values (p_sale_id, v_batch_id, v_plateaux, v_oeufs, v_price);

    insert into public.egg_movements (date, kind, qty_eggs, batch_id, sale_id, note)
    values (
      coalesce(p_date, v_sale.date), 'vente', -v_eggs, v_batch_id, p_sale_id,
      'Vente ' || p_channel
    );
  end loop;

  return jsonb_build_object('sale_id', p_sale_id, 'total_fcfa', v_total);
end $$;

-- Supprime une vente : retire ses mouvements 'vente' puis la vente
-- (les lignes suivent par cascade).
create or replace function public.farm_delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  delete from public.egg_movements where sale_id = p_sale_id and kind = 'vente';
  delete from public.farm_sales where id = p_sale_id;
end $$;

-- Encaisse un paiement client : insère le paiement puis le répartit
-- sur les ventes impayées du client, de la plus ancienne à la plus
-- récente (paid_amount mis à jour sur chaque vente).
create or replace function public.farm_receive_payment(
  p_client_id uuid,
  p_amount int,
  p_date date,
  p_method text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_left int;
  v_sale record;
  v_remaining int;
  v_take int;
  v_payment_id uuid;
  v_allocated int := 0;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_client_id is null then
    raise exception 'Client obligatoire';
  end if;
  if not exists (select 1 from public.farm_clients where id = p_client_id) then
    raise exception 'Client introuvable';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide';
  end if;
  if p_method not in ('especes','mobile_money','autre') then
    raise exception 'Moyen de paiement invalide';
  end if;

  insert into public.client_payments (client_id, date, amount, method, note)
  values (p_client_id, coalesce(p_date, current_date), p_amount, p_method, coalesce(p_note, ''))
  returning id into v_payment_id;

  v_left := p_amount;

  for v_sale in
    select id, total_fcfa, paid_amount
    from public.farm_sales
    where client_id = p_client_id
    order by date asc, created_at asc
  loop
    exit when v_left <= 0;
    v_remaining := greatest(0, v_sale.total_fcfa - v_sale.paid_amount);
    if v_remaining > 0 then
      v_take := least(v_remaining, v_left);
      update public.farm_sales
      set paid_amount = paid_amount + v_take
      where id = v_sale.id;
      v_left := v_left - v_take;
      v_allocated := v_allocated + v_take;
    end if;
  end loop;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'amount', p_amount,
    'allocated', v_allocated,
    'unallocated', v_left
  );
end $$;

-- ---------- Droits d'exécution ----------
revoke all on function public.farm_line_eggs(int, int, int) from public;
revoke all on function public.farm_line_amount(int, int, int, int) from public;
revoke all on function public.farm_create_sale(date, uuid, text, int, text, jsonb, boolean) from public;
revoke all on function public.farm_update_sale(uuid, date, uuid, text, int, text, jsonb, boolean) from public;
revoke all on function public.farm_delete_sale(uuid) from public;
revoke all on function public.farm_receive_payment(uuid, int, date, text, text) from public;

grant execute on function public.farm_line_eggs(int, int, int) to authenticated;
grant execute on function public.farm_line_amount(int, int, int, int) to authenticated;
grant execute on function public.farm_create_sale(date, uuid, text, int, text, jsonb, boolean) to authenticated;
grant execute on function public.farm_update_sale(uuid, date, uuid, text, int, text, jsonb, boolean) to authenticated;
grant execute on function public.farm_delete_sale(uuid) to authenticated;
grant execute on function public.farm_receive_payment(uuid, int, date, text, text) to authenticated;

-- Recharge du cache de schéma PostgREST.
notify pgrst, 'reload schema';

-- ============================================================
-- Ferme v2.3 : catalogue de dépenses modifiable, caisse et
-- apports du promoteur, dépenses récurrentes (via rappels).
-- Idempotent : ajouts uniquement, aucune fonction ni donnée
-- existante modifiée (sauf remplacement à l'identique des
-- fonctions de vente pour tracer entry_paid, et suppression
-- de la contrainte CHECK sur farm_expenses.category sans
-- toucher aux lignes).
-- ============================================================

-- ---------- Catalogue de catégories de dépenses ----------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Valeurs initiales (idempotent : on conflict sur name).
insert into public.expense_categories (name, sort_order) values
  ('Aliments achetés', 1),
  ('Maïs', 2),
  ('Provende fabriquée', 3),
  ('Produits vétérinaires', 4),
  ('Alvéoles et emballages', 5),
  ('Travaux', 6),
  ('Électricité', 7),
  ('Entretien', 8),
  ('Copeaux', 9),
  ('Salaires', 10),
  ('Transport', 11),
  ('Autres charges', 12)
on conflict (name) do nothing;

-- La catégorie devient libre : on retire la contrainte CHECK.
-- Les anciennes valeurs (aliment, soins, main_oeuvre, transport,
-- autre) restent du texte valide, aucune ligne n'est modifiée.
alter table public.farm_expenses
  drop constraint if exists farm_expenses_category_check;

-- ---------- Caisse : apports, retraits, autres mouvements ----------
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind text not null
    check (kind in ('apport_promoteur','remboursement','retrait','autre_entree','autre_sortie')),
  amount int not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists cash_movements_date on public.cash_movements (date desc);

-- ---------- Ventes : montant payé à la saisie (pour la trésorerie) ----------
-- paid_amount cumule paiement à la saisie + allocations d'encaissements ;
-- entry_paid mémorise la part encaissée le jour de la vente.
alter table public.farm_sales
  add column if not exists entry_paid int not null default 0;

-- Recréation à l'identique de farm_create_sale / farm_update_sale
-- avec entry_paid renseigné (= paid_amount à la saisie).
create or replace function public.farm_create_sale(
  p_date date,
  p_client_id uuid,
  p_channel text,
  p_paid_amount int,
  p_note text,
  p_lines jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_sale_id uuid;
  v_line jsonb;
  v_batch_id uuid;
  v_plateaux int;
  v_oeufs int;
  v_price int;
  v_eggs int;
  v_stock int;
  v_total int := 0;
  v_paid int;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_channel not in ('ferme','boutique') then
    raise exception 'Canal invalide (ferme ou boutique)';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Ajoute au moins une ligne de vente';
  end if;
  if p_client_id is not null then
    select name into v_name from public.farm_clients where id = p_client_id;
    if not found then
      raise exception 'Client introuvable';
    end if;
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  v_paid := greatest(0, coalesce(p_paid_amount, 0));

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    if v_plateaux < 0 or v_oeufs < 0 or v_price < 0 then
      raise exception 'Quantités ou prix invalides dans une ligne';
    end if;
    if v_oeufs >= v_tray then
      raise exception 'Œufs détachés : entre 0 et % par ligne', v_tray - 1;
    end if;
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);
    if v_eggs <= 0 then
      raise exception 'Chaque ligne doit contenir au moins un œuf';
    end if;
    if not exists (select 1 from public.farm_batches where id = v_batch_id) then
      raise exception 'Bande introuvable dans une ligne';
    end if;
    if not p_force then
      select coalesce(sum(qty_eggs), 0) into v_stock
      from public.egg_movements where batch_id = v_batch_id;
      if v_stock < v_eggs then
        select name into v_name from public.farm_batches where id = v_batch_id;
        raise exception 'Stock insuffisant pour la bande % : % œufs demandés, % en stock',
          coalesce(v_name, 'inconnue'), v_eggs, v_stock;
      end if;
    end if;
    v_total := v_total + public.farm_line_amount(v_plateaux, v_oeufs, v_price, v_tray);
  end loop;

  if v_paid > v_total then
    raise exception 'Le montant payé (%) dépasse le total de la vente (%)', v_paid, v_total;
  end if;

  insert into public.farm_sales (date, client_id, channel, paid_amount, entry_paid, total_fcfa, note)
  values (coalesce(p_date, current_date), p_client_id, p_channel, v_paid, v_paid, v_total, coalesce(p_note, ''))
  returning id into v_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);

    insert into public.farm_sale_lines (sale_id, batch_id, plateaux, oeufs, unit_price)
    values (v_sale_id, v_batch_id, v_plateaux, v_oeufs, v_price);

    insert into public.egg_movements (date, kind, qty_eggs, batch_id, sale_id, note)
    values (
      coalesce(p_date, current_date), 'vente', -v_eggs, v_batch_id, v_sale_id,
      'Vente ' || coalesce(p_channel, 'ferme')
    );
  end loop;

  return jsonb_build_object('sale_id', v_sale_id, 'total_fcfa', v_total);
end $$;

create or replace function public.farm_update_sale(
  p_sale_id uuid,
  p_date date,
  p_client_id uuid,
  p_channel text,
  p_paid_amount int,
  p_note text,
  p_lines jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.farm_sales%rowtype;
  v_tray int;
  v_line jsonb;
  v_batch_id uuid;
  v_plateaux int;
  v_oeufs int;
  v_price int;
  v_eggs int;
  v_stock int;
  v_total int := 0;
  v_paid int;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select * into v_sale from public.farm_sales where id = p_sale_id;
  if not found then
    raise exception 'Vente introuvable';
  end if;

  v_paid := greatest(0, coalesce(p_paid_amount, 0));

  delete from public.egg_movements where sale_id = p_sale_id and kind = 'vente';
  delete from public.farm_sale_lines where sale_id = p_sale_id;

  if p_channel not in ('ferme','boutique') then
    raise exception 'Canal invalide (ferme ou boutique)';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Ajoute au moins une ligne de vente';
  end if;
  if p_client_id is not null then
    select name into v_name from public.farm_clients where id = p_client_id;
    if not found then
      raise exception 'Client introuvable';
    end if;
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    if v_plateaux < 0 or v_oeufs < 0 or v_price < 0 then
      raise exception 'Quantités ou prix invalides dans une ligne';
    end if;
    if v_oeufs >= v_tray then
      raise exception 'Œufs détachés : entre 0 et % par ligne', v_tray - 1;
    end if;
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);
    if v_eggs <= 0 then
      raise exception 'Chaque ligne doit contenir au moins un œuf';
    end if;
    if not exists (select 1 from public.farm_batches where id = v_batch_id) then
      raise exception 'Bande introuvable dans une ligne';
    end if;
    if not p_force then
      select coalesce(sum(qty_eggs), 0) into v_stock
      from public.egg_movements where batch_id = v_batch_id;
      if v_stock < v_eggs then
        select name into v_name from public.farm_batches where id = v_batch_id;
        raise exception 'Stock insuffisant pour la bande % : % œufs demandés, % en stock',
          coalesce(v_name, 'inconnue'), v_eggs, v_stock;
      end if;
    end if;
    v_total := v_total + public.farm_line_amount(v_plateaux, v_oeufs, v_price, v_tray);
  end loop;

  if v_paid > v_total then
    raise exception 'Le montant payé (%) dépasse le total de la vente (%)', v_paid, v_total;
  end if;

  update public.farm_sales
  set date = coalesce(p_date, v_sale.date),
      client_id = p_client_id,
      channel = p_channel,
      paid_amount = v_paid,
      entry_paid = v_paid,
      total_fcfa = v_total,
      note = coalesce(p_note, '')
  where id = p_sale_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_batch_id := (v_line->>'batch_id')::uuid;
    v_plateaux := coalesce((v_line->>'plateaux')::int, 0);
    v_oeufs := coalesce((v_line->>'oeufs')::int, 0);
    v_price := coalesce((v_line->>'unit_price')::int, 0);
    v_eggs := public.farm_line_eggs(v_plateaux, v_oeufs, v_tray);

    insert into public.farm_sale_lines (sale_id, batch_id, plateaux, oeufs, unit_price)
    values (p_sale_id, v_batch_id, v_plateaux, v_oeufs, v_price);

    insert into public.egg_movements (date, kind, qty_eggs, batch_id, sale_id, note)
    values (
      coalesce(p_date, v_sale.date), 'vente', -v_eggs, v_batch_id, p_sale_id,
      'Vente ' || p_channel
    );
  end loop;

  return jsonb_build_object('sale_id', p_sale_id, 'total_fcfa', v_total);
end $$;

-- ---------- RLS : nouvelles tables réservées aux admins ----------
alter table public.expense_categories enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "admin only expense_categories" on public.expense_categories;
create policy "admin only expense_categories" on public.expense_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only cash_movements" on public.cash_movements;
create policy "admin only cash_movements" on public.cash_movements
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Grants API ----------
grant select, insert, update, delete on public.expense_categories to authenticated;
grant select, insert, update, delete on public.cash_movements to authenticated;

-- Les fonctions de vente sont déjà accordées ; on ré-applique les grants
-- au cas où la fonction aurait été recréée.
grant execute on function public.farm_create_sale(date, uuid, text, int, text, jsonb, boolean) to authenticated;
grant execute on function public.farm_update_sale(uuid, date, uuid, text, int, text, jsonb, boolean) to authenticated;

-- Recharge du cache de schéma PostgREST.
notify pgrst, 'reload schema';

-- ============================================================
-- Ferme v2.4 : tableau de bord « verre dépoli » (dash2_*).
-- Nouvelles fonctions uniquement : les fonctions dashboard_*
-- existantes ne sont ni modifiées ni supprimées.
-- Réservé aux admins (is_admin()), security definer,
-- set search_path = public, fuseau UTC (= Lomé).
-- Idempotent : create or replace + revoke/grant.
-- ============================================================

-- ---------- Synthèse de la période ----------
-- Ventes = farm_sales (toutes) + commandes du site payées ou livrées.
create or replace function public.dash2_summary(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_ventes numeric := 0;
  v_ventes_site numeric;
  v_commandes bigint := 0;
  v_depenses numeric := 0;
  v_a_encaisser numeric := 0;
  v_impayes_site numeric;
  v_ponte_today record;
  v_stock record;
  v_prod_today jsonb := '[]'::jsonb;
  v_prod_yesterday jsonb;
  v_stock_json jsonb := '[]'::jsonb;
  v_sains_yesterday numeric := 0;
  v_casses_yesterday numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  -- Ventes de la période : ventes ferme/boutique + commandes site payées/livrées.
  select coalesce(sum(total_fcfa), 0) into v_ventes
  from public.farm_sales
  where date between p_from and p_to;

  if public.dashboard_has_payment_status() then
    execute format($q$
      select coalesce(sum(total_fcfa), 0), count(*)
      from public.orders
      where created_at::date between %L and %L
        and status <> 'annulee'
        and (payment_status = 'paye' or status = 'livree')
    $q$, p_from, p_to) into v_ventes_site, v_commandes;
    v_ventes := v_ventes + coalesce(v_ventes_site, 0);
  else
    execute format($q$
      select coalesce(sum(total_fcfa), 0), count(*)
      from public.orders
      where created_at::date between %L and %L and status <> 'annulee'
    $q$, p_from, p_to) into v_ventes_site, v_commandes;
    v_ventes := v_ventes + coalesce(v_ventes_site, 0);
  end if;

  select coalesce(sum(amount), 0) into v_depenses
  from public.farm_expenses
  where date between p_from and p_to;

  -- À encaisser : soldes clients (ventes ferme/boutique) + commandes site non payées.
  select coalesce(sum(greatest(total_fcfa - paid_amount, 0)), 0) into v_a_encaisser
  from public.farm_sales
  where total_fcfa > paid_amount;

  if public.dashboard_has_payment_status() then
    execute $q$
      select coalesce(sum(total_fcfa), 0)
      from public.orders
      where status <> 'annulee' and payment_status = 'non_paye'
    $q$ into v_impayes_site;
    v_a_encaisser := v_a_encaisser + coalesce(v_impayes_site, 0);
  end if;

  -- Production du jour, par bande (mouvements 'ponte' = sains+cassés,
  -- 'casse' = moins les cassés ; sains = ponte + casse).
  for v_ponte_today in
    select b.id as batch_id, b.name, b.display_color,
           coalesce(sum(m.qty_eggs) filter (where m.kind = 'ponte'), 0) as ponte,
           coalesce(sum(m.qty_eggs) filter (where m.kind = 'casse'), 0) as casse
    from public.egg_movements m
    join public.farm_batches b on b.id = m.batch_id
    where m.date = current_date and m.kind in ('ponte', 'casse')
    group by b.id, b.name, b.display_color
    order by b.name
  loop
    v_prod_today := v_prod_today || jsonb_build_object(
      'batch_id', v_ponte_today.batch_id,
      'name', v_ponte_today.name,
      'display_color', v_ponte_today.display_color,
      'sains', v_ponte_today.ponte + v_ponte_today.casse,
      'casses', -v_ponte_today.casse
    );
  end loop;

  -- Production de la veille (totaux, pour la comparaison en %).
  select
    coalesce(sum(m.qty_eggs) filter (where m.kind = 'ponte'), 0)
      + coalesce(sum(m.qty_eggs) filter (where m.kind = 'casse'), 0),
    -coalesce(sum(m.qty_eggs) filter (where m.kind = 'casse'), 0)
  into v_sains_yesterday, v_casses_yesterday
  from public.egg_movements m
  where m.date = current_date - 1 and m.kind in ('ponte', 'casse');

  v_prod_yesterday := jsonb_build_object(
    'sains', coalesce(v_sains_yesterday, 0),
    'casses', coalesce(v_casses_yesterday, 0)
  );

  -- Stock par bande (somme de tous les mouvements).
  for v_stock in
    select b.id as batch_id, b.name, b.display_color, b.egg_color, b.caliber,
           coalesce(sum(m.qty_eggs), 0) as stock
    from public.egg_movements m
    join public.farm_batches b on b.id = m.batch_id
    group by b.id, b.name, b.display_color, b.egg_color, b.caliber
    order by b.name
  loop
    v_stock_json := v_stock_json || jsonb_build_object(
      'batch_id', v_stock.batch_id,
      'name', v_stock.name,
      'display_color', v_stock.display_color,
      'egg_color', v_stock.egg_color,
      'caliber', v_stock.caliber,
      'stock_oeufs', v_stock.stock
    );
  end loop;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'eggs_per_tray', v_tray,
    'ventes', v_ventes,
    'commandes', v_commandes,
    'depenses', v_depenses,
    'benefice', v_ventes - v_depenses,
    'a_encaisser', v_a_encaisser,
    'production_aujourdhui', v_prod_today,
    'production_veille', v_prod_yesterday,
    'stock', v_stock_json
  );
end $$;

-- ---------- Série temporelle ----------
-- p_metric : production | production:<batch_id> | ventes | commandes |
--             depenses | benefice | tresorerie
-- p_group  : 'jour' (défaut) ou 'mois'. Un point par période, 0 sinon.
create or replace function public.dash2_series(
  p_metric text,
  p_from date,
  p_to date,
  p_group text default 'jour'
)
returns table(label text, valeur numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_sales_where text;
  v_prod_batch uuid;
  v_src text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  v_sales_where := public.dashboard_sales_filter();

  -- Source de la métrique, en SQL dynamique sur la date "jour".
  if p_metric = 'production' or p_metric like 'production:%' then
    if p_metric like 'production:%' then
      v_prod_batch := substring(p_metric from 12)::uuid;
      v_src := format(
        'select m.date as d, sum(m.qty_eggs)::numeric as val from public.egg_movements m where m.kind = ''ponte'' and m.batch_id = %L::uuid group by 1',
        v_prod_batch
      );
    else
      v_src := 'select m.date as d, sum(m.qty_eggs)::numeric as val from public.egg_movements m where m.kind = ''ponte'' group by 1';
    end if;
  elsif p_metric = 'ventes' then
    -- Toutes les ventes ferme/boutique + commandes site payées ou livrées.
    v_src := format(
      'select d, sum(val)::numeric as val from (
         select s.date as d, sum(s.total_fcfa)::numeric as val from public.farm_sales s group by 1
         union all
         select (o.created_at at time zone ''UTC'')::date as d, sum(o.total_fcfa)::numeric as val
         from public.orders o where %s group by 1
       ) t group by d',
      v_sales_where
    );
  elsif p_metric = 'commandes' then
    -- Toutes les commandes du site non annulées (payées ou non).
    v_src := 'select (created_at at time zone ''UTC'')::date as d, count(*)::numeric as val from public.orders where status <> ''annulee'' group by 1';
  elsif p_metric = 'depenses' then
    v_src := 'select date as d, sum(amount)::numeric as val from public.farm_expenses group by 1';
  elsif p_metric = 'benefice' then
    v_src := format(
      'select coalesce(v.d, x.d) as d, coalesce(v.val, 0) - coalesce(x.val, 0) as val
       from (
         select d, sum(val)::numeric as val from (
           select s.date as d, sum(s.total_fcfa)::numeric as val from public.farm_sales s group by 1
           union all
           select (o.created_at at time zone ''UTC'')::date as d, sum(o.total_fcfa)::numeric as val
           from public.orders o where %s group by 1
         ) a group by d
       ) v
       full join (select date as d, sum(amount)::numeric as val from public.farm_expenses group by 1) x on x.d = v.d',
      v_sales_where
    );
  elsif p_metric = 'tresorerie' then
    -- Flux quotidiens de caisse, cumulés depuis le début.
    v_src := 'select d, cum from (
       select d, sum(v) over (order by d) as cum from (
         select d, sum(v)::numeric as v from (
           select p.date as d, p.amount::numeric as v from public.client_payments p
           union all
           select s.date as d, s.entry_paid::numeric as v from public.farm_sales s
           union all
           select m.date as d, case when m.kind in (''apport_promoteur'',''autre_entree'') then m.amount else -m.amount end as v
           from public.cash_movements m
           union all
           select e.date as d, -e.amount::numeric as v from public.farm_expenses e
         ) f group by d
       ) g
     ) c';
    -- La cumulation porte sur tout l'historique : on ne filtre pas les dates
    -- sources, la jointure avec generate_series ne garde que la période.
    return query execute format($q$
      select to_char(gs.d, 'DD/MM'), coalesce(c.cum, 0)::numeric
      from generate_series(%L::date, %L::date, interval '1 day') as gs(d)
      left join lateral (
        select cum from (%s) t where t.d <= gs.d order by t.d desc limit 1
      ) c on true
      group by gs.d, c.cum order by gs.d
    $q$, p_from, p_to, v_src);
    return;
  else
    raise exception 'Métrique invalide (production, production:<bande>, ventes, commandes, depenses, benefice, tresorerie)';
  end if;

  if p_group = 'mois' then
    return query execute format($q$
      select to_char(gs.d, 'MM/YYYY'), coalesce(sum(s.val), 0)::numeric
      from generate_series(date_trunc('month', %L::date)::date, %L::date, interval '1 month') as gs(d)
      left join (
        select date_trunc('month', d)::date as d, sum(val)::numeric as val
        from (%s) t group by 1
      ) s on s.d = gs.d::date
      group by gs.d order by gs.d
    $q$, p_from, p_to, v_src);
  else
    return query execute format($q$
      select to_char(gs.d, 'DD/MM'), coalesce(sum(s.val), 0)::numeric
      from generate_series(%L::date, %L::date, interval '1 day') as gs(d)
      left join (%s) s on s.d = gs.d::date
      group by gs.d order by gs.d
    $q$, p_from, p_to, v_src);
  end if;
end $$;

-- ---------- Production / CA / stock par bande ----------
create or replace function public.dash2_by_batch(p_from date, p_to date)
returns table(
  batch_id uuid,
  name text,
  display_color text,
  egg_color text,
  production_oeufs numeric,
  production_plateaux numeric,
  ca_fcfa numeric,
  stock_oeufs numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select coalesce(nullif(btrim(value), '')::int, 30) into v_tray
  from public.site_texts where key = 'eggs_per_tray';
  v_tray := coalesce(v_tray, 30);
  if v_tray <= 0 then v_tray := 30; end if;

  return query
    select
      b.id,
      b.name,
      b.display_color,
      b.egg_color,
      coalesce(prod.oeufs, 0)::numeric,
      round(coalesce(prod.oeufs, 0)::numeric / v_tray, 1),
      coalesce(ca.montant, 0)::numeric,
      coalesce(stk.oeufs, 0)::numeric
    from public.farm_batches b
    left join (
      select m.batch_id, sum(m.qty_eggs) as oeufs
      from public.egg_movements m
      where m.kind = 'ponte' and m.date between p_from and p_to
      group by m.batch_id
    ) prod on prod.batch_id = b.id
    left join (
      select l.batch_id, sum(
        public.farm_line_amount(l.plateaux, l.oeufs, l.unit_price, v_tray)
      ) as montant
      from public.farm_sale_lines l
      join public.farm_sales s on s.id = l.sale_id
      where s.date between p_from and p_to
      group by l.batch_id
    ) ca on ca.batch_id = b.id
    left join (
      select m.batch_id, sum(m.qty_eggs) as oeufs
      from public.egg_movements m
      group by m.batch_id
    ) stk on stk.batch_id = b.id
    where b.status = 'actif'
    order by b.name;
end $$;

-- ---------- Top : produits du site + clients de la ferme ----------
create or replace function public.dash2_top(p_from date, p_to date)
returns table(type text, name text, quantite numeric, montant numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay_filter text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  v_pay_filter := case
    when public.dashboard_has_payment_status()
      then 'and (o.payment_status = ''paye'' or o.status = ''livree'')'
    else ''
  end;

  return query execute format($q$
    select p.type, p.name, p.quantite, p.montant from (
      select 'produit'::text as type, it->>'name' as name,
             sum((it->>'quantity')::numeric) as quantite,
             sum((it->>'price_fcfa')::numeric * (it->>'quantity')::numeric) as montant,
             row_number() over (order by sum((it->>'quantity')::numeric) desc) as rn
      from public.orders o
      cross join lateral jsonb_array_elements(o.items) it
      where o.created_at::date between %L and %L
        and o.status <> 'annulee'
        %s
      group by it->>'name'
    ) p where p.rn <= 8
    union all
    select cl.type, cl.name, cl.quantite, cl.montant from (
      select 'client'::text as type, coalesce(c.name, 'Client de passage') as name,
             0::numeric as quantite,
             sum(s.total_fcfa)::numeric as montant,
             row_number() over (order by sum(s.total_fcfa) desc) as rn
      from public.farm_sales s
      left join public.farm_clients c on c.id = s.client_id
      where s.date between %L and %L
      group by coalesce(c.name, 'Client de passage')
    ) cl where cl.rn <= 8
    order by type, montant desc
  $q$, p_from, p_to, v_pay_filter, p_from, p_to);
end $$;

-- ---------- Dépenses par catégorie (noms libres du catalogue) ----------
create or replace function public.dash2_expenses_by_category(p_from date, p_to date)
returns table(categorie text, montant numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  return query
    select e.category as categorie, sum(e.amount)::numeric as montant
    from public.farm_expenses e
    where e.date between p_from and p_to
    group by e.category
    order by montant desc;
end $$;

-- ---------- Activités récentes mélangées ----------
create or replace function public.dash2_activity(p_limit int default 30)
returns table(
  at timestamptz,
  date date,
  type text,
  label text,
  montant numeric,
  status text,
  ref_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 30), 200));

  return query
    select * from (
      -- Ventes ferme/boutique
      select s.created_at as at, s.date as date, 'vente'::text as type,
             'Vente' || case when c.name is not null then ' — ' || c.name else '' end as label,
             s.total_fcfa::numeric as montant,
             case
               when s.total_fcfa <= s.paid_amount then 'Payé'
               when s.paid_amount > 0 then 'Partiel'
               else 'À payer'
             end as status,
             s.id as ref_id
      from public.farm_sales s
      left join public.farm_clients c on c.id = s.client_id
      union all
      -- Pontes (production)
      select m.created_at, m.date, 'production',
             'Ponte' || case when b.name is not null then ' — ' || b.name else '' end,
             null::numeric,
             'Enregistré',
             m.id
      from public.egg_movements m
      left join public.farm_batches b on b.id = m.batch_id
      where m.kind = 'ponte'
      union all
      -- Autres mouvements d'œufs (casse, perte, don)
      select m.created_at, m.date, 'mouvement',
             initcap(m.kind) || case when b.name is not null then ' — ' || b.name else '' end,
             null::numeric,
             'Enregistré',
             m.id
      from public.egg_movements m
      left join public.farm_batches b on b.id = m.batch_id
      where m.kind <> 'ponte' and m.kind <> 'vente'
      union all
      -- Dépenses
      select e.created_at, e.date, 'depense',
             'Dépense' || case when e.category <> '' then ' — ' || e.category else '' end,
             e.amount::numeric,
             'Enregistré',
             e.id
      from public.farm_expenses e
      union all
      -- Commandes du site
      select o.created_at, o.created_at::date, 'commande',
             'Commande site',
             o.total_fcfa::numeric,
             initcap(replace(o.status, '_', ' ')),
             o.id
      from public.orders o
      where o.status <> 'annulee'
      union all
      -- Encaissements clients
      select p.created_at, p.date, 'encaissement',
             'Encaissement' || case when c.name is not null then ' — ' || c.name else '' end,
             p.amount::numeric,
             'Payé',
             p.id
      from public.client_payments p
      left join public.farm_clients c on c.id = p.client_id
      union all
      -- Mouvements de caisse
      select m.created_at, m.date, 'caisse',
             initcap(replace(m.kind, '_', ' ')),
             m.amount::numeric,
             'Enregistré',
             m.id
      from public.cash_movements m
    ) a
    order by a.at desc
    limit v_limit;
end $$;

-- ---------- Publication Realtime (idempotent) ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'egg_movements', 'farm_sales', 'client_payments',
    'farm_expenses', 'cash_movements', 'farm_events', 'orders'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Grants ----------
revoke all on function public.dash2_summary(date, date) from public;
revoke all on function public.dash2_series(text, date, date, text) from public;
revoke all on function public.dash2_by_batch(date, date) from public;
revoke all on function public.dash2_top(date, date) from public;
revoke all on function public.dash2_expenses_by_category(date, date) from public;
revoke all on function public.dash2_activity(int) from public;

grant execute on function public.dash2_summary(date, date) to authenticated;
grant execute on function public.dash2_series(text, date, date, text) to authenticated;
grant execute on function public.dash2_by_batch(date, date) to authenticated;
grant execute on function public.dash2_top(date, date) to authenticated;
grant execute on function public.dash2_expenses_by_category(date, date) to authenticated;
grant execute on function public.dash2_activity(int) to authenticated;

-- Recharge du cache de schéma PostgREST.
notify pgrst, 'reload schema';

-- ---------- Vue farm_batches_view : expose les colonnes de ferme-v2-1 ----------
drop view if exists public.farm_batches_view;
create view public.farm_batches_view as
select
  b.*,
  b.initial_count + coalesce(sum(e.qty), 0) as effectif_actuel
from public.farm_batches b
left join public.farm_batch_events e on e.batch_id = b.id
group by b.id;
alter view public.farm_batches_view set (security_invoker = true);
grant select on public.farm_batches_view to authenticated;
