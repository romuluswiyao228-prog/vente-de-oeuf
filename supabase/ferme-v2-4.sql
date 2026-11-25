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

-- ---------- Vue farm_batches_view : expose les colonnes de ferme-v2-1 ----------
-- La vue d'origine (select b.*) a figé sa liste de colonnes avant l'ajout de
-- egg_color / display_color / caliber : on la recrée pour les exposer.
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
