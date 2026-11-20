-- Fonction permettant au tout premier compte de devenir admin.
-- security definer : contourne la RLS pour compter les admins existants
-- (sinon un utilisateur normal ne voit que son propre profil et le
-- comptage renverrait toujours 0, ce qui rendrait TOUT compte admin).
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

-- Le compte existant (créé avant ce correctif) devient admin
-- s'il n'y a pas déjà un administrateur.
update public.profiles
set role = 'admin'
where id = '1261e8d3-d645-492f-9847-035dfed18936'
  and not exists (
    select 1 from public.profiles
    where role = 'admin' and id <> '1261e8d3-d645-492f-9847-035dfed18936'
  );
