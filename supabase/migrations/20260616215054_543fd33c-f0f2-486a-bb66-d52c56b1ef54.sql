ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway text NOT NULL DEFAULT 'infinitepay';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mp_preference_id text;