CREATE POLICY "Users can create payments for own orders"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = payments.order_id
  AND orders.user_id = auth.uid()
));