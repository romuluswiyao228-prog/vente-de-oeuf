-- Ajoute le champ « race » aux produits (utilisé pour regrouper les œufs par race).
alter table public.products
  add column if not exists race text not null default '';
