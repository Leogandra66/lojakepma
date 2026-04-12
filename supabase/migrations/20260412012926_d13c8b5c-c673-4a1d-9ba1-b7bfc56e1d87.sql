
-- Create discount type enum
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (needed to validate at checkout)
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (true);

-- Only admins can manage coupons
CREATE POLICY "Admins can insert coupons"
ON public.coupons FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons"
ON public.coupons FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons"
ON public.coupons FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add coupon reference to orders
ALTER TABLE public.orders ADD COLUMN coupon_id UUID REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN discount_amount NUMERIC DEFAULT 0;
