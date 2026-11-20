# La Basse-Cour

Site de vente d'œufs fécondés, de volailles et de matériel — Togo.
React + Vite + TypeScript + Tailwind CSS v4 + Supabase.

## Démarrage

```bash
npm install
npm run dev
```

## Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécutez `supabase/schema.sql` (crée les tables, les policies RLS, le bucket Storage `media` et les données initiales).
3. Créez `.env` à la racine :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

4. Pour devenir administrateur : créez un compte via **Authentication → Users**, puis exécutez dans le SQL Editor :

```sql
update public.profiles set role = 'admin' where id = '<USER_ID>';
```

L'espace admin est accessible sur `/admin`.

## Structure

- `src/pages/` — pages publiques + `admin/` (onglets Produits, Médias, Textes, Livraison & Paiement, Commandes, Blog)
- `src/components/` — Header, Footer, Hero, Marquee, ProductCard, SmartImg (fallback terracotta), etc.
- `src/lib/store.ts` — hooks de lecture + mutations admin
- `src/lib/types.ts` — types et constantes (types de produits, statuts de commande)
- `supabase/schema.sql` — schéma complet de la base

## Commandes

```bash
npm run dev      # serveur de dev
npm run build    # build de production
npm run lint     # oxlint
npm run preview  # prévisualise le build
```
