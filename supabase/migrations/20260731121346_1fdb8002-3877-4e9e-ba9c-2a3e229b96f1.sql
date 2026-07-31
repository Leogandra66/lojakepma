CREATE OR REPLACE FUNCTION public.sync_product_status_from_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Produtos de encomenda mantêm o status independentemente do estoque
  IF NEW.status = 'preorder'::product_status THEN
    RETURN NEW;
  END IF;

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
$function$;

DROP TRIGGER IF EXISTS sync_product_status_from_stock_trg ON public.products;
CREATE TRIGGER sync_product_status_from_stock_trg
BEFORE INSERT OR UPDATE OF stock_quantity, status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_status_from_stock();