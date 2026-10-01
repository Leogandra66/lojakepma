CREATE POLICY "Users can request own representative account"
ON public.b2b_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND account_type = 'representante'::public.b2b_account_type
  AND status = 'pendente'::public.b2b_status
);

CREATE OR REPLACE FUNCTION public.request_b2b_representative_access(
  _company_name TEXT,
  _document TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
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

  SELECT lower((auth.jwt() ->> 'email')) INTO _email;

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
  RETURNING id INTO _account_id;

  RETURN _account_id;
END;
$$;