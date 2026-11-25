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
