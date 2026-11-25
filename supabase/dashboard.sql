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
-- REQUÊTE DE TEST : à lancer dans le SQL Editor pour vérifier
-- que les données apparaissent (ex. une commande livrée de 3 000 FCFA).
-- ============================================================

-- 1) Synthèse complète des compteurs (ventes_jour, commandes_jour,
--    stock, bénéfice du mois, à encaisser...).
select public.dashboard_summary();

-- 2) Série des ventes sur 30 jours : un point par jour (0 les jours
--    sans activité). La commande de 3 000 FCFA doit apparaître sur
--    son jour — filtrez les valeurs non nulles pour la voir vite.
select * from public.dashboard_series('ventes', '30j', 0)
where valeur <> 0
order by label;

-- 3) Idem sur 7 jours et 12 mois si besoin :
-- select * from public.dashboard_series('ventes', '7j', 0) where valeur <> 0;
-- select * from public.dashboard_series('ventes', '12m', 0) where valeur <> 0;
