ALTER TABLE public.b2b_clients
  ADD COLUMN cnpj TEXT,
  ADD COLUMN state_registration TEXT;

CREATE UNIQUE INDEX b2b_clients_rep_cnpj_unique_idx
  ON public.b2b_clients (rep_account_id, cnpj)
  WHERE cnpj IS NOT NULL;

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
BEGIN
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

CREATE TRIGGER validate_b2b_client_tax_fields_trigger
BEFORE INSERT OR UPDATE ON public.b2b_clients
FOR EACH ROW EXECUTE FUNCTION public.validate_b2b_client_tax_fields();

COMMENT ON COLUMN public.b2b_clients.cnpj IS 'CNPJ obrigatório para novos cadastros e edições, armazenado somente com dígitos';
COMMENT ON COLUMN public.b2b_clients.state_registration IS 'Inscrição estadual obrigatória; aceita Isento';