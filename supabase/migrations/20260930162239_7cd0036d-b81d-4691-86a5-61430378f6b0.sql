DROP POLICY IF EXISTS "Users can insert own b2b account" ON public.b2b_accounts;
DROP POLICY IF EXISTS "Users can update own b2b account" ON public.b2b_accounts;

CREATE POLICY "Admins can create b2b accounts"
ON public.b2b_accounts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.b2b_accounts
  ADD CONSTRAINT b2b_accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

REVOKE INSERT, UPDATE, DELETE ON public.b2b_orders FROM authenticated;
GRANT SELECT ON public.b2b_orders TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.b2b_payment_terms FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_payment_terms TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.b2b_accounts FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_accounts TO authenticated;