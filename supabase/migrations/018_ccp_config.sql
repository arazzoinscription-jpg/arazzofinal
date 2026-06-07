-- 018 — Coordonnées CCP / BaridiMob (RIP) + configuration active
ALTER TABLE public.ccp_config ADD COLUMN IF NOT EXISTS rip TEXT;

UPDATE public.ccp_config SET is_active = FALSE;

INSERT INTO public.ccp_config (account_number, account_key, beneficiary_name, rip, is_active)
VALUES ('11143398', '78', 'MME MEZAGHCHA NOUDJOUD', '00799999001114339892', TRUE);
