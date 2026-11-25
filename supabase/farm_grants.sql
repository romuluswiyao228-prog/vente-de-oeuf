-- ============================================================
-- Grants manquants sur les tables/vues de la section Ferme.
-- Sans eux, le rôle authenticated reçoit « permission denied »
-- (la RLS « admin only » continue de filtrer les lignes : seul
-- un admin peut lire/écrire, le public reste bloqué).
-- Idempotent : rejouable sans risque.
-- ============================================================

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

-- Vérification rapide (doit renvoyer les 10 lignes de privilèges) :
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in (
--     'farm_batches','farm_batch_events','egg_movements','incubations',
--     'farm_supplies','supply_movements','farm_expenses','farm_tasks',
--     'farm_batches_view','farm_supplies_view'
--   )
-- order by table_name, privilege_type;
