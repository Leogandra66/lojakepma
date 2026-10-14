CREATE OR REPLACE FUNCTION public.review_b2b_order(_order_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order public.b2b_orders;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Acesso administrativo necessário'; END IF;
  SELECT * INTO _order FROM public.b2b_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _order.status <> 'aguardando_aprovacao' THEN RAISE EXCEPTION 'Este pedido já foi analisado'; END IF;
  UPDATE public.b2b_orders
    SET status = CASE WHEN _approve THEN 'aprovado'::public.b2b_order_status ELSE 'recusado'::public.b2b_order_status END,
        approved_by = auth.uid(), approved_at = now()
    WHERE id = _order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.review_b2b_order(uuid, boolean) TO authenticated;