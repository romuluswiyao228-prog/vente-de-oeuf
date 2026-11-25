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
