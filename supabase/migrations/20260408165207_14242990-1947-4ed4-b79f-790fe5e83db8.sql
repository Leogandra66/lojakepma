
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT position_range CHECK (position >= 1 AND position <= 6),
  CONSTRAINT unique_product_position UNIQUE (product_id, position)
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images"
ON public.product_images
FOR SELECT
USING (true);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
