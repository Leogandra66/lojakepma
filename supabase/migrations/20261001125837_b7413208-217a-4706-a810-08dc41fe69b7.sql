CREATE OR REPLACE FUNCTION public.request_b2b_representative_access(
  _company_name TEXT,
  _document TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  _account_id UUID;
  _email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário confirmar o e-mail e entrar para solicitar acesso';
  END IF;

  IF nullif(trim(_company_name), '') IS NULL OR char_length(trim(_company_name)) > 160 THEN
    RAISE EXCEPTION 'Informe um nome ou empresa válido';
  END IF;
  IF char_length(coalesce(trim(_document), '')) > 30 THEN
    RAISE EXCEPTION 'Documento muito longo';
  END IF;
  IF char_length(coalesce(trim(_phone), '')) > 30 THEN
    RAISE EXCEPTION 'Telefone muito longo';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.b2b_accounts (
    user_id, account_type, status, company_name, document, phone, email
  )
  VALUES (
    auth.uid(),
    'representante'::public.b2b_account_type,
    'pendente'::public.b2b_status,
    trim(_company_name),
    nullif(trim(_document), ''),
    nullif(trim(_phone), ''),
    _email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_name = CASE
      WHEN public.b2b_accounts.status = 'pendente'::public.b2b_status THEN EXCLUDED.company_name
      ELSE public.b2b_accounts.company_name
    END,
    document = CASE
      WHEN public.b2b_accounts.status = 'pendente'::public.b2b_status THEN EXCLUDED.document
      ELSE public.b2b_accounts.document
    END,
    phone = CASE
      WHEN public.b2b_accounts.status = 'pendente'::public.b2b_status THEN EXCLUDED.phone
      ELSE public.b2b_accounts.phone
    END,
    email = CASE
      WHEN public.b2b_accounts.status = 'pendente'::public.b2b_status THEN EXCLUDED.email
      ELSE public.b2b_accounts.email
    END
  RETURNING id INTO _account_id;

  RETURN _account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_b2b_representative_access(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_b2b_representative_access(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_b2b_representative_access(TEXT, TEXT, TEXT) TO service_role;