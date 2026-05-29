-- Enums for B2B
CREATE TYPE public.b2b_account_type AS ENUM ('lojista', 'representante');
CREATE TYPE public.b2b_status AS ENUM ('pendente', 'aprovado', 'recusado');

-- B2B accounts (lojistas e representantes)
CREATE TABLE public.b2b_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  account_type public.b2b_account_type NOT NULL,
  status public.b2b_status NOT NULL DEFAULT 'pendente',
  company_name TEXT,
  document TEXT,
  phone TEXT,
  email TEXT,
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_accounts TO authenticated;
GRANT ALL ON public.b2b_accounts TO service_role;

ALTER TABLE public.b2b_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own b2b account"
ON public.b2b_accounts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own b2b account"
ON public.b2b_accounts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own b2b account"
ON public.b2b_accounts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all b2b accounts"
ON public.b2b_accounts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all b2b accounts"
ON public.b2b_accounts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete b2b accounts"
ON public.b2b_accounts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_b2b_accounts_updated_at
BEFORE UPDATE ON public.b2b_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is the current user an approved B2B account?
CREATE OR REPLACE FUNCTION public.is_approved_b2b(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.b2b_accounts
    WHERE user_id = _user_id AND status = 'aprovado'
  )
$$;

-- Helper: does the given b2b account belong to the current user (a representante)?
CREATE OR REPLACE FUNCTION public.owns_b2b_account(_account_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.b2b_accounts
    WHERE id = _account_id AND user_id = _user_id
  )
$$;

-- B2B clients (lojistas geridos por um representante)
CREATE TABLE public.b2b_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_account_id UUID NOT NULL REFERENCES public.b2b_accounts(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  document TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_clients TO authenticated;
GRANT ALL ON public.b2b_clients TO service_role;

ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can view own clients"
ON public.b2b_clients FOR SELECT TO authenticated
USING (public.owns_b2b_account(rep_account_id, auth.uid()));

CREATE POLICY "Reps can insert own clients"
ON public.b2b_clients FOR INSERT TO authenticated
WITH CHECK (public.owns_b2b_account(rep_account_id, auth.uid()));

CREATE POLICY "Reps can update own clients"
ON public.b2b_clients FOR UPDATE TO authenticated
USING (public.owns_b2b_account(rep_account_id, auth.uid()))
WITH CHECK (public.owns_b2b_account(rep_account_id, auth.uid()));

CREATE POLICY "Reps can delete own clients"
ON public.b2b_clients FOR DELETE TO authenticated
USING (public.owns_b2b_account(rep_account_id, auth.uid()));

CREATE POLICY "Admins can view all clients"
ON public.b2b_clients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_b2b_clients_updated_at
BEFORE UPDATE ON public.b2b_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wholesale prices (protected; hidden from public B2C store)
CREATE TABLE public.product_wholesale_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_wholesale_prices TO authenticated;
GRANT ALL ON public.product_wholesale_prices TO service_role;

ALTER TABLE public.product_wholesale_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved b2b can view wholesale prices"
ON public.product_wholesale_prices FOR SELECT TO authenticated
USING (public.is_approved_b2b(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert wholesale prices"
ON public.product_wholesale_prices FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update wholesale prices"
ON public.product_wholesale_prices FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wholesale prices"
ON public.product_wholesale_prices FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_wholesale_prices_updated_at
BEFORE UPDATE ON public.product_wholesale_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Additive columns on orders for B2B (optional; B2C store ignores them)
ALTER TABLE public.orders
  ADD COLUMN is_b2b BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN b2b_account_id UUID,
  ADD COLUMN placed_by_rep_id UUID;