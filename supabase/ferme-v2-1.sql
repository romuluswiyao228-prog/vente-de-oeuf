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
