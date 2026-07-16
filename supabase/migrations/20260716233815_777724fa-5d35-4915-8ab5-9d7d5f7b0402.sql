
CREATE OR REPLACE FUNCTION public.sync_product_status_from_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.stock_quantity <= 0 THEN
    NEW.status := 'unavailable'::product_status;
  ELSE
    NEW.status := 'in_stock'::product_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_status_from_stock ON public.products;
CREATE TRIGGER trg_sync_product_status_from_stock
BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_status_from_stock();

UPDATE public.products
SET status = CASE
  WHEN COALESCE(stock_quantity, 0) <= 0 THEN 'unavailable'::product_status
  ELSE 'in_stock'::product_status
END
WHERE stock_quantity IS NOT NULL;
