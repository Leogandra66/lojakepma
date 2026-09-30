ALTER TABLE public.products ADD COLUMN price_b2b NUMERIC;

CREATE TYPE public.b2b_order_status AS ENUM ('aguardando_aprovacao', 'aprovado', 'recusado', 'cancelado');

CREATE TABLE public.b2b_payment_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description TEXT,
  installment_days INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.b2b_payment_terms TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.b2b_payment_terms TO authenticated;
GRANT ALL ON public.b2b_payment_terms TO service_role;
ALTER TABLE public.b2b_payment_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved reps can view active payment terms"
ON public.b2b_payment_terms FOR SELECT TO authenticated
USING ((active AND public.is_approved_b2b(auth.uid())) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create payment terms"
ON public.b2b_payment_terms FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update payment terms"
ON public.b2b_payment_terms FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete payment terms"
ON public.b2b_payment_terms FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_b2b_payment_terms_updated_at
BEFORE UPDATE ON public.b2b_payment_terms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.b2b_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_account_id UUID NOT NULL REFERENCES public.b2b_accounts(id),
  client_id UUID NOT NULL REFERENCES public.b2b_clients(id),
  payment_term_id UUID NOT NULL REFERENCES public.b2b_payment_terms(id),
  status public.b2b_order_status NOT NULL DEFAULT 'aguardando_aprovacao',
  payment_term_snapshot TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_orders TO authenticated;
GRANT ALL ON public.b2b_orders TO service_role;
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps can view own b2b orders"
ON public.b2b_orders FOR SELECT TO authenticated
USING (public.owns_b2b_account(rep_account_id, auth.uid()));
CREATE POLICY "Admins can view all b2b orders"
ON public.b2b_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update b2b orders"
ON public.b2b_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_b2b_orders_updated_at
BEFORE UPDATE ON public.b2b_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.b2b_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.b2b_order_items TO authenticated;
GRANT ALL ON public.b2b_order_items TO service_role;
ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps can view own b2b order items"
ON public.b2b_order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.b2b_orders o
  WHERE o.id = order_id AND public.owns_b2b_account(o.rep_account_id, auth.uid())
));
CREATE POLICY "Admins can view all b2b order items"
ON public.b2b_order_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX b2b_clients_rep_account_idx ON public.b2b_clients(rep_account_id);
CREATE INDEX b2b_orders_rep_account_idx ON public.b2b_orders(rep_account_id, created_at DESC);
CREATE INDEX b2b_orders_client_idx ON public.b2b_orders(client_id);
CREATE INDEX b2b_orders_status_idx ON public.b2b_orders(status, created_at DESC);
CREATE INDEX b2b_order_items_order_idx ON public.b2b_order_items(order_id);

CREATE OR REPLACE FUNCTION public.is_approved_representative(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.b2b_accounts
    WHERE user_id = _user_id
      AND account_type = 'representante'::public.b2b_account_type
      AND status = 'aprovado'::public.b2b_status
  )
$$;

DROP POLICY IF EXISTS "Approved b2b can view wholesale prices" ON public.product_wholesale_prices;
CREATE POLICY "Approved representatives can view wholesale prices"
ON public.product_wholesale_prices FOR SELECT TO authenticated
USING (public.is_approved_representative(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

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
AS $$
DECLARE
  _rep public.b2b_accounts;
  _client public.b2b_clients;
  _term public.b2b_payment_terms;
  _order_id UUID;
  _item JSONB;
  _product public.products;
  _quantity INTEGER;
  _total NUMERIC := 0;
  _term_snapshot TEXT;
BEGIN
  SELECT * INTO _rep FROM public.b2b_accounts
  WHERE user_id = auth.uid() AND account_type = 'representante' AND status = 'aprovado';
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso B2B não autorizado'; END IF;

  SELECT * INTO _client FROM public.b2b_clients
  WHERE id = _client_id AND rep_account_id = _rep.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inválido'; END IF;

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

    INSERT INTO public.b2b_order_items (order_id, product_id, product_name, product_code, quantity, unit_price, line_total)
    VALUES (_order_id, _product.id, _product.name, _product.bling_code, _quantity, _product.price_b2b, _quantity * _product.price_b2b);
    _total := _total + (_quantity * _product.price_b2b);
  END LOOP;

  UPDATE public.b2b_orders SET total = _total WHERE id = _order_id;
  RETURN _order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_b2b_order(UUID, UUID, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_b2b_order(_order_id UUID, _approve BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.b2b_orders;
  _item public.b2b_order_items;
  _stock INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Acesso administrativo necessário'; END IF;
  SELECT * INTO _order FROM public.b2b_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _order.status <> 'aguardando_aprovacao' THEN RAISE EXCEPTION 'Este pedido já foi analisado'; END IF;

  IF NOT _approve THEN
    UPDATE public.b2b_orders SET status = 'recusado', approved_by = auth.uid(), approved_at = now() WHERE id = _order_id;
    RETURN;
  END IF;

  FOR _item IN SELECT * FROM public.b2b_order_items WHERE order_id = _order_id ORDER BY product_id FOR UPDATE
  LOOP
    SELECT stock_quantity INTO _stock FROM public.products WHERE id = _item.product_id FOR UPDATE;
    IF _stock IS NULL OR _stock < _item.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para %', _item.product_name;
    END IF;
  END LOOP;

  FOR _item IN SELECT * FROM public.b2b_order_items WHERE order_id = _order_id ORDER BY product_id
  LOOP
    UPDATE public.products SET stock_quantity = stock_quantity - _item.quantity WHERE id = _item.product_id;
  END LOOP;

  UPDATE public.b2b_orders SET status = 'aprovado', approved_by = auth.uid(), approved_at = now() WHERE id = _order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_b2b_order(UUID, BOOLEAN) TO authenticated;

CREATE POLICY "Approved representatives can view b2b product prices"
ON public.products FOR SELECT TO authenticated
USING (public.is_approved_representative(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));