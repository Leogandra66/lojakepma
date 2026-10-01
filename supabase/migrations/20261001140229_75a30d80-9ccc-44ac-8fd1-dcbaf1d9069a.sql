CREATE OR REPLACE FUNCTION public.validate_b2b_client_tax_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _cnpj TEXT;
  _digits INTEGER[];
  _sum INTEGER;
  _remainder INTEGER;
  _first_digit INTEGER;
  _second_digit INTEGER;
  _state TEXT;
BEGIN
  NEW.company_name := trim(coalesce(NEW.company_name, ''));
  NEW.contact_name := trim(coalesce(NEW.contact_name, ''));
  NEW.phone := trim(coalesce(NEW.phone, ''));
  NEW.email := lower(trim(coalesce(NEW.email, '')));
  NEW.address_zip := trim(coalesce(NEW.address_zip, ''));
  NEW.address_street := trim(coalesce(NEW.address_street, ''));
  NEW.address_number := trim(coalesce(NEW.address_number, ''));
  NEW.address_complement := nullif(trim(coalesce(NEW.address_complement, '')), '');
  NEW.address_neighborhood := trim(coalesce(NEW.address_neighborhood, ''));
  NEW.address_city := trim(coalesce(NEW.address_city, ''));
  _state := upper(trim(coalesce(NEW.address_state, '')));
  NEW.address_state := _state;

  IF NEW.company_name = '' OR char_length(NEW.company_name) > 160 THEN
    RAISE EXCEPTION 'Informe a razão social ou nome';
  END IF;
  IF NEW.contact_name = '' OR char_length(NEW.contact_name) > 120 THEN
    RAISE EXCEPTION 'Informe a pessoa de contato';
  END IF;
  IF NEW.phone = '' OR char_length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Informe o telefone';
  END IF;
  IF NEW.email = '' OR char_length(NEW.email) > 255 OR NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Informe um e-mail válido';
  END IF;
  IF NEW.address_zip = '' OR char_length(NEW.address_zip) > 10 THEN
    RAISE EXCEPTION 'Informe o CEP';
  END IF;
  IF NEW.address_street = '' OR char_length(NEW.address_street) > 160 THEN
    RAISE EXCEPTION 'Informe a rua';
  END IF;
  IF NEW.address_number = '' OR char_length(NEW.address_number) > 30 THEN
    RAISE EXCEPTION 'Informe o número';
  END IF;
  IF NEW.address_neighborhood = '' OR char_length(NEW.address_neighborhood) > 100 THEN
    RAISE EXCEPTION 'Informe o bairro';
  END IF;
  IF NEW.address_city = '' OR char_length(NEW.address_city) > 100 THEN
    RAISE EXCEPTION 'Informe a cidade';
  END IF;
  IF NOT (_state = ANY (ARRAY['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])) THEN
    RAISE EXCEPTION 'Informe uma UF válida';
  END IF;
  IF NEW.address_complement IS NOT NULL AND char_length(NEW.address_complement) > 100 THEN
    RAISE EXCEPTION 'Complemento muito longo';
  END IF;

  _cnpj := regexp_replace(coalesce(NEW.cnpj, ''), '[^0-9]', '', 'g');
  NEW.state_registration := trim(coalesce(NEW.state_registration, ''));

  IF char_length(_cnpj) <> 14 OR _cnpj ~ '^([0-9])\1{13}$' THEN
    RAISE EXCEPTION 'Informe um CNPJ válido';
  END IF;

  _digits := ARRAY(
    SELECT substring(_cnpj FROM position FOR 1)::INTEGER
    FROM generate_series(1, 14) AS position
  );

  _sum := _digits[1] * 5 + _digits[2] * 4 + _digits[3] * 3 + _digits[4] * 2
    + _digits[5] * 9 + _digits[6] * 8 + _digits[7] * 7 + _digits[8] * 6
    + _digits[9] * 5 + _digits[10] * 4 + _digits[11] * 3 + _digits[12] * 2;
  _remainder := _sum % 11;
  _first_digit := CASE WHEN _remainder < 2 THEN 0 ELSE 11 - _remainder END;

  _sum := _digits[1] * 6 + _digits[2] * 5 + _digits[3] * 4 + _digits[4] * 3
    + _digits[5] * 2 + _digits[6] * 9 + _digits[7] * 8 + _digits[8] * 7
    + _digits[9] * 6 + _digits[10] * 5 + _digits[11] * 4 + _digits[12] * 3
    + _first_digit * 2;
  _remainder := _sum % 11;
  _second_digit := CASE WHEN _remainder < 2 THEN 0 ELSE 11 - _remainder END;

  IF _digits[13] <> _first_digit OR _digits[14] <> _second_digit THEN
    RAISE EXCEPTION 'Informe um CNPJ válido';
  END IF;

  IF NEW.state_registration = '' THEN
    RAISE EXCEPTION 'Informe a inscrição estadual ou Isento';
  END IF;

  IF lower(NEW.state_registration) = 'isento' THEN
    NEW.state_registration := 'Isento';
  ELSIF NEW.state_registration !~ '^[0-9A-Za-z./-]{2,30}$' THEN
    RAISE EXCEPTION 'Informe uma inscrição estadual válida ou Isento';
  END IF;

  NEW.cnpj := _cnpj;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_b2b_client_tax_fields() IS 'Valida os dados fiscais, contato e endereço obrigatórios de clientes B2B; somente o complemento é opcional';