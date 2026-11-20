-- Retire le numéro WhatsApp factice du seed initial
update public.site_texts set value = '' where key = 'whatsapp_number' and value = '22890000000';
