DROP FUNCTION IF EXISTS public.get_b2b_catalog();

CREATE FUNCTION public.get_b2b_catalog()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  bling_code TEXT,
  stock_quantity INTEGER,
  price_b2b NUMERIC,
  image_url TEXT,
  category TEXT,
  active BOOLEAN,
  video_url TEXT,
  uses_plek_technology BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    p.id,
    p.name,
    p.description,
    p.bling_code,
    p.stock_quantity,
    p.price_b2b,
    p.image_url,
    p.category,
    p.active,
    p.video_url,
    p.uses_plek_technology
  FROM public.products p
  WHERE public.is_approved_representative(auth.uid())
    AND p.active = true
    AND p.price_b2b IS NOT NULL
    AND lower(trim(coalesce(p.category, ''))) <> lower('Eletrônica')
  ORDER BY p.name
$function$;

REVOKE ALL ON FUNCTION public.get_b2b_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_b2b_catalog() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_b2b_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_b2b_order(
  _client_id UUID,
  _payment_term_id UUID,
  _notes TEXT,
  _items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _rep public.b2b_accounts;
  _client public.b2b_clients;
  _term public.b2b_payment_terms;
  _order_id UUID;
  _item JSONB;
  _product public.products;
  _quantity INTEGER;
  _unit_price NUMERIC;
  _total NUMERIC := 0;
  _term_snapshot TEXT;
  _client_state TEXT;
  _discount_rate NUMERIC := 0;
BEGIN
  SELECT * INTO _rep FROM public.b2b_accounts
  WHERE user_id = auth.uid() AND account_type = 'representante' AND status = 'aprovado';
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso B2B não autorizado'; END IF;

  SELECT * INTO _client FROM public.b2b_clients
  WHERE id = _client_id AND rep_account_id = _rep.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inválido'; END IF;

  _client_state := upper(trim(coalesce(_client.address_state, '')));
  IF _client_state = '' THEN
    RAISE EXCEPTION 'Informe o estado do cliente antes de enviar o pedido';
  END IF;
  IF _client_state !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'O estado do cliente deve ser uma UF válida com 2 letras';
  END IF;
  IF _client_state <> 'MG' THEN
    _discount_rate := 0.14;
  END IF;

  SELECT * INTO _term FROM public.b2b_payment_terms
  WHERE id = _payment_term_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condição de pagamento inválida'; END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 100 THEN
    RAISE EXCEPTION 'O pedido deve conter entre 1 e 100 produtos';
  END IF;
  IF _notes IS NOT NULL AND char_length(_notes) > 2000 THEN RAISE EXCEPTION 'Observações muito longas'; END IF;

  _term_snapshot := _term.name || CASE WHEN coalesce(_term.description, '') <> '' THEN ' — ' || _term.description ELSE '' END;
  INSERT INTO public.b2b_orders (rep_account_id, client_id, payment_term_id, payment_term_snapshot, notes)
  VALUES (_rep.id, _client.id, _term.id, _term_snapshot, nullif(trim(_notes), ''))
  RETURNING id INTO _order_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    BEGIN
      _quantity := (_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Quantidade inválida';
    END;
    IF _quantity IS NULL OR _quantity <= 0 OR _quantity > 10000 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

    SELECT * INTO _product FROM public.products
    WHERE id = (_item->>'product_id')::UUID
      AND active = true
      AND lower(trim(coalesce(category, ''))) <> lower('Eletrônica')
      AND price_b2b IS NOT NULL
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível para venda B2B'; END IF;

    _unit_price := round(_product.price_b2b * (1 - _discount_rate), 2);
    INSERT INTO public.b2b_order_items (order_id, product_id, product_name, product_code, quantity, unit_price, line_total)
    VALUES (_order_id, _product.id, _product.name, _product.bling_code, _quantity, _unit_price, _quantity * _unit_price);
    _total := _total + (_quantity * _unit_price);
  END LOOP;

  UPDATE public.b2b_orders SET total = _total WHERE id = _order_id;
  RETURN _order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_b2b_order(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_b2b_order(UUID, UUID, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_b2b_order(UUID, UUID, TEXT, JSONB) TO authenticated;