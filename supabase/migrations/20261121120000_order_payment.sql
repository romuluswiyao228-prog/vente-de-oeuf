-- Suivi du paiement des commandes (Mobile Money) — ajout seul, aucune donnée existante modifiée.
alter table public.orders
  add column if not exists payment_status text not null default 'non_paye',
  add column if not exists payment_ref text,
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_payment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('non_paye', 'paye'));
  end if;
end $$;

comment on column public.orders.payment_status is 'non_paye | paye — modifiable uniquement par un admin (RLS orders)';
comment on column public.orders.payment_ref is 'Référence de la transaction Mobile Money (facultative)';
comment on column public.orders.paid_at is 'Date d''enregistrement du paiement par l''admin';
