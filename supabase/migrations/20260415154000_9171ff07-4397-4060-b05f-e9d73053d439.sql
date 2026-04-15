
CREATE TABLE public.coupon_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, product_id)
);

ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coupon products"
ON public.coupon_products FOR SELECT TO public
USING (true);

CREATE POLICY "Admins can insert coupon products"
ON public.coupon_products FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupon products"
ON public.coupon_products FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupon products"
ON public.coupon_products FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
