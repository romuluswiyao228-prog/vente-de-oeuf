-- ============================================================
-- Section Ferme : lots d'animaux, mouvements d'œufs, incubation,
-- approvisionnements, dépenses, rappels — accès admin uniquement.
-- Idempotent : aucune table/colonne existante n'est modifiée.
-- ============================================================

-- ---------- Lots d'animaux ----------
create table if not exists public.farm_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null default '',
  breed text not null default '',
  kind text not null default 'autre'
    check (kind in ('pondeuses','reproducteurs','poussins','autre')),
  arrived_on date,
  initial_count int not null default 0,
  status text not null default 'actif' check (status in ('actif','termine')),
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

-- Effectif actuel = initial_count + somme des qty des événements
create or replace view public.farm_batches_view as
select
  b.*,
  b.initial_count + coalesce(sum(e.qty), 0) as effectif_actuel
from public.farm_batches b
left join public.farm_batch_events e on e.batch_id = b.id
group by b.id;
alter view public.farm_batches_view set (security_invoker = true);

-- ---------- Registre des œufs (réserve) ----------
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

-- ---------- Incubation ----------
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

-- ---------- Approvisionnements ----------
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

-- ---------- Dépenses ----------
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

-- ---------- Rappels ----------
create table if not exists public.farm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date not null,
  done boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Réglage : œufs par plateau ----------
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

-- ---------- RLS : tout est réservé aux admins ----------
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

-- ---------- Fonctions atomiques (admins uniquement) ----------

-- Transfert de la réserve vers la boutique : quantité en œufs (multiple du plateau),
-- stock produit augmenté du nombre de plateaux.
create or replace function public.farm_transfer_eggs(
  p_product_id uuid,
  p_eggs int,
  p_date date,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tray int;
  v_trays int;
  v_reserve int;
  v_product record;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_eggs is null or p_eggs <= 0 then
    raise exception 'Nombre d''œufs invalide';
  end if;

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
  if not found then
    raise exception 'Produit introuvable';
  end if;
  if v_product.type <> 'oeufs' then
    raise exception 'Seuls les produits de type Œufs peuvent recevoir des œufs';
  end if;

  insert into public.egg_movements (date, kind, qty_eggs, product_id, note)
  values (coalesce(p_date, current_date), 'transfert_boutique', -p_eggs, p_product_id, coalesce(p_note, ''));

  update public.products set stock = stock + v_trays where id = p_product_id;

  return jsonb_build_object('trays', v_trays, 'eggs', p_eggs);
end $$;

-- Démarre une incubation : crée l'incubation et sort les œufs de la réserve.
create or replace function public.farm_start_incubation(
  p_batch_id uuid,
  p_started_on date,
  p_eggs_set int,
  p_days int,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_days int;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  if p_eggs_set is null or p_eggs_set <= 0 then
    raise exception 'Nombre d''œufs à couver invalide';
  end if;
  v_days := coalesce(p_days, 21);
  if v_days < 1 or v_days > 90 then
    raise exception 'Durée d''incubation invalide';
  end if;
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

-- Clôt une incubation ; peut créer le lot de poussins avec l'effectif éclos.
create or replace function public.farm_finish_incubation(
  p_id uuid,
  p_hatched_count int,
  p_create_batch boolean,
  p_batch_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inc public.incubations%rowtype;
  v_batch_id uuid;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select * into v_inc from public.incubations where id = p_id;
  if not found then
    raise exception 'Incubation introuvable';
  end if;
  if v_inc.status <> 'en_cours' then
    raise exception 'Cette incubation est déjà clôturée';
  end if;

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
