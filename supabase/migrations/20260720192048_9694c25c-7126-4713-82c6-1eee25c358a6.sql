
-- Split payments: add payment_mode / split_config to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS split_config jsonb;

-- Table for individual payment parts of a split order
CREATE TABLE IF NOT EXISTS public.order_payment_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  part_index int NOT NULL CHECK (part_index IN (1,2)),
  method text NOT NULL CHECK (method IN ('card','pix')),
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  mp_preference_id text,
  mp_payment_id text,
  mp_init_point text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','refunded')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, part_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payment_parts TO authenticated;
GRANT ALL ON public.order_payment_parts TO service_role;

ALTER TABLE public.order_payment_parts ENABLE ROW LEVEL SECURITY;

-- Owner (of the order) can read their own parts
CREATE POLICY "Users read own order parts"
  ON public.order_payment_parts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- Admins can read everything
CREATE POLICY "Admins read all order parts"
  ON public.order_payment_parts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_order_payment_parts_order ON public.order_payment_parts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_parts_status ON public.order_payment_parts(status);

CREATE TRIGGER trg_order_payment_parts_updated
  BEFORE UPDATE ON public.order_payment_parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
