ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bling_code TEXT,
  ADD COLUMN IF NOT EXISTS stock_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS products_bling_code_unique
  ON public.products (bling_code)
  WHERE bling_code IS NOT NULL;