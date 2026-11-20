-- Confirme tous les comptes en attente de vérification d'e-mail
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
