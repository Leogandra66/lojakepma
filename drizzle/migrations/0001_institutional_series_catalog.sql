CREATE OR REPLACE FUNCTION public.get_institutional_series()
RETURNS TABLE(id uuid, name text, description text, image_url text, category text, images text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.description, p.image_url, p.category,
    COALESCE((SELECT array_agg(i.image_url ORDER BY i.position) FROM product_images i WHERE i.product_id = p.id), '{}')
  FROM products p
  WHERE p.category IS NOT NULL AND p.category <> 'Eletrônica'
  ORDER BY p.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_institutional_series() TO anon, authenticated;