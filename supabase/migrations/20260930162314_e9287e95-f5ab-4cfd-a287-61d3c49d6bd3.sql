REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (id, name, description, price, image_url, category, status, stock_quantity, preorder_estimated_delivery, created_at, updated_at, video_url, active, electronics_tag, uses_plek_technology, bling_code, stock_synced_at) ON public.products TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_b2b_catalog()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  bling_code TEXT,
  stock_quantity INTEGER,
  price_b2b NUMERIC,
  image_url TEXT,
  category TEXT,
  active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.description, p.bling_code, p.stock_quantity, p.price_b2b, p.image_url, p.category, p.active
  FROM public.products p
  WHERE public.is_approved_representative(auth.uid())
    AND p.active = true
    AND p.price_b2b IS NOT NULL
    AND lower(trim(coalesce(p.category, ''))) <> lower('Eletrônica')
  ORDER BY p.name
$$;
REVOKE ALL ON FUNCTION public.get_b2b_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_b2b_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_products()
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário';
  END IF;
  RETURN QUERY SELECT * FROM public.products ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_b2b_representative(
  _email TEXT,
  _company_name TEXT,
  _document TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _user_id UUID;
  _account_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário';
  END IF;
  IF nullif(trim(_email), '') IS NULL OR nullif(trim(_company_name), '') IS NULL THEN
    RAISE EXCEPTION 'E-mail e nome da empresa são obrigatórios';
  END IF;

  SELECT id INTO _user_id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário da loja foi encontrado com este e-mail';
  END IF;

  INSERT INTO public.b2b_accounts (user_id, account_type, status, company_name, document, phone, email)
  VALUES (_user_id, 'representante', 'aprovado', trim(_company_name), nullif(trim(_document), ''), nullif(trim(_phone), ''), lower(trim(_email)))
  ON CONFLICT (user_id) DO UPDATE SET
    account_type = 'representante',
    status = 'aprovado',
    company_name = EXCLUDED.company_name,
    document = EXCLUDED.document,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email
  RETURNING id INTO _account_id;

  RETURN _account_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_b2b_representative(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_b2b_representative(TEXT, TEXT, TEXT, TEXT) TO authenticated;