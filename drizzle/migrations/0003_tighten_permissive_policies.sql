DROP POLICY IF EXISTS "Anyone can submit DAS interest" ON public.das_prelaunch_leads;
CREATE POLICY "Anyone can submit DAS interest" ON public.das_prelaunch_leads FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(trim(name)) BETWEEN 1 AND 120
  AND char_length(email) BETWEEN 5 AND 255
  AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND char_length(trim(phone)) BETWEEN 8 AND 30
);

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(event_type) BETWEEN 1 AND 50
  AND char_length(path) BETWEEN 1 AND 500
  AND (referrer IS NULL OR char_length(referrer) <= 1000)
  AND (user_agent IS NULL OR char_length(user_agent) <= 1000)
  AND (session_id IS NULL OR char_length(session_id) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can view coupon products" ON public.coupon_products;
CREATE POLICY "Users can view products of valid coupons" ON public.coupon_products FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_id AND c.active = true AND (c.expires_at IS NULL OR c.expires_at > now()))
);