CREATE POLICY "Users can update own payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = payments.order_id
  AND orders.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = payments.order_id
  AND orders.user_id = auth.uid()
));