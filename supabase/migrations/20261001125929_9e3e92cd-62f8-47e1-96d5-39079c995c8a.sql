CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_b2b_request BOOLEAN := coalesce(NEW.raw_user_meta_data ->> 'account_request', '') = 'representante';
  _company_name TEXT := trim(coalesce(NEW.raw_user_meta_data ->> 'company_name', ''));
  _document TEXT := trim(coalesce(NEW.raw_user_meta_data ->> 'document', ''));
  _phone TEXT := trim(coalesce(NEW.raw_user_meta_data ->> 'phone', ''));
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  IF _is_b2b_request THEN
    IF _company_name = '' OR char_length(_company_name) > 160 THEN
      RAISE EXCEPTION 'Informe um nome ou empresa válido';
    END IF;
    IF char_length(_document) > 30 THEN
      RAISE EXCEPTION 'Documento muito longo';
    END IF;
    IF char_length(_phone) > 30 THEN
      RAISE EXCEPTION 'Telefone muito longo';
    END IF;

    INSERT INTO public.b2b_accounts (
      user_id, account_type, status, company_name, document, phone, email
    ) VALUES (
      NEW.id,
      'representante'::public.b2b_account_type,
      'pendente'::public.b2b_status,
      _company_name,
      nullif(_document, ''),
      nullif(_phone, ''),
      lower(NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$;