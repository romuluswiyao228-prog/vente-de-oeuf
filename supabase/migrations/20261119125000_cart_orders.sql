-- ============================================================
-- Panier & commandes : colonnes orders + fonction create_order
-- ============================================================

-- Colonnes additionnelles sur orders (rétrocompatible)
alter table public.orders
  add column if not exists reference text,
  add column if not exists fulfillment text not null default 'livraison',
  add column if not exists subtotal_fcfa integer not null default 0,
  add column if not exists delivery_fee_fcfa integer not null default 0;

-- ---------- Fonction de création de commande ----------
-- SECURITY DEFINER : les prix, le stock et les frais sont TOUJOURS
-- recalculés côté base — le navigateur n'envoie que product_id + quantité.
-- Le stock n'est PAS décrémenté ici (fait à la confirmation admin).
create or replace function public.create_order(
  p_customer_name text,
  p_phone text,
  p_email text default '',
  p_fulfillment text default 'livraison',
  p_zone_id uuid default null,
  p_address text default '',
  p_payment_method text default '',
  p_note text default '',
  p_items jsonb default '[]'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_subtotal int := 0;
  v_fee int := 0;
  v_zone_name text := '';
  v_items jsonb := '[]'::jsonb;
  v_total int;
  v_order_id uuid;
  v_reference text;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Nom du client manquant';
  end if;
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'Numéro de téléphone manquant';
  end if;
  if p_fulfillment not in ('livraison', 'retrait') then
    raise exception 'Mode de réception invalide';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier est vide';
  end if;

  -- Vérification produits + recalcul des prix côté serveur
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'Quantité invalide';
    end;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantité invalide';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and status = 'actif';

    if not found then
      raise exception 'Un produit du panier est introuvable ou indisponible';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuffisant pour « % » (disponible : %)', v_product.name, v_product.stock;
    end if;

    v_subtotal := v_subtotal + v_product.price_fcfa * v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'price_fcfa', v_product.price_fcfa
    );
  end loop;

  -- Frais de livraison (uniquement si livraison)
  if p_fulfillment = 'livraison' then
    if p_zone_id is null then
      raise exception 'Zone de livraison manquante';
    end if;
    if p_address is null or btrim(p_address) = '' then
      raise exception 'Adresse manquante';
    end if;
    select name, fee_fcfa into v_zone_name, v_fee
    from public.delivery_zones
    where id = p_zone_id and active;
    if not found then
      raise exception 'Zone de livraison invalide';
    end if;
  else
    v_zone_name := 'Retrait sur place';
  end if;

  v_total := v_subtotal + v_fee;

  insert into public.orders (
    customer_name, phone, email, address, zone,
    items, total_fcfa, payment_method, status, note,
    reference, fulfillment, subtotal_fcfa, delivery_fee_fcfa
  ) values (
    btrim(p_customer_name), btrim(p_phone), coalesce(p_email, ''),
    coalesce(p_address, ''), v_zone_name,
    v_items, v_total, coalesce(p_payment_method, ''), 'nouvelle', coalesce(p_note, ''),
    '', p_fulfillment, v_subtotal, v_fee
  )
  returning id into v_order_id;

  v_reference := upper(left(v_order_id::text, 8));
  update public.orders set reference = v_reference where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'reference', v_reference,
    'subtotal_fcfa', v_subtotal,
    'delivery_fee_fcfa', v_fee,
    'total_fcfa', v_total,
    'fulfillment', p_fulfillment,
    'zone', v_zone_name,
    'items', v_items
  );
end $$;

-- Exécutable par les visiteurs (anon) et les connectés
revoke all on function public.create_order(text, text, text, text, uuid, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, uuid, text, text, text, jsonb) to anon, authenticated;

-- ---------- Nettoyage des valeurs par défaut ----------
update public.site_texts set value = 'Fraîchement pondu|Livraison à Lomé et dans tout le Togo|Paiement Mobile Money sécurisé|Envoi soigné|Retrait sur place possible'
  where key = 'marquee' and value like '%commission%';
update public.site_texts set value = '' where key in ('contact_email', 'contact_phone') and value in ('contact@labassecour.tg', '+228 00 00 00 00', '+228 90 00 00 00');
insert into public.site_texts (key, value) values
  ('whatsapp_order_note', 'Merci d''indiquer votre quartier et le mode de paiement souhaité.')
on conflict (key) do nothing;
