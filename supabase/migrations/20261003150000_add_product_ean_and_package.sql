-- EAN/GTIN e dados da embalagem (peso em kg, dimensões em cm) para produtos.
-- Os campos são internos: NÃO são adicionados ao GRANT SELECT de anon/authenticated
-- (ver migration 20260930162314). O admin lê tudo via admin_list_products().
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ean_gtin text,
  ADD COLUMN IF NOT EXISTS package_weight_kg numeric(8,3),
  ADD COLUMN IF NOT EXISTS package_height_cm numeric(8,1),
  ADD COLUMN IF NOT EXISTS package_width_cm numeric(8,1),
  ADD COLUMN IF NOT EXISTS package_length_cm numeric(8,1);

ALTER TABLE public.products
  ADD CONSTRAINT products_ean_gtin_format
    CHECK (ean_gtin IS NULL OR ean_gtin ~ '^([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'),
  ADD CONSTRAINT products_package_weight_positive
    CHECK (package_weight_kg IS NULL OR package_weight_kg > 0),
  ADD CONSTRAINT products_package_height_positive
    CHECK (package_height_cm IS NULL OR package_height_cm > 0),
  ADD CONSTRAINT products_package_width_positive
    CHECK (package_width_cm IS NULL OR package_width_cm > 0),
  ADD CONSTRAINT products_package_length_positive
    CHECK (package_length_cm IS NULL OR package_length_cm > 0);

-- Um GTIN identifica um único produto.
CREATE UNIQUE INDEX IF NOT EXISTS products_ean_gtin_unique
  ON public.products (ean_gtin)
  WHERE ean_gtin IS NOT NULL;

COMMENT ON COLUMN public.products.ean_gtin IS 'EAN/GTIN (8, 12, 13 ou 14 dígitos)';
COMMENT ON COLUMN public.products.package_weight_kg IS 'Peso da embalagem em kg';
COMMENT ON COLUMN public.products.package_height_cm IS 'Altura da embalagem em cm';
COMMENT ON COLUMN public.products.package_width_cm IS 'Largura da embalagem em cm';
COMMENT ON COLUMN public.products.package_length_cm IS 'Comprimento da embalagem em cm';
