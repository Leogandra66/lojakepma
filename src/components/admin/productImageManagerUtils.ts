import { supabase } from "@/integrations/supabase/client";

export interface ProductImage {
  id: string;
  image_url: string;
  position: number;
  product_id: string;
}

type ProductImagePosition = Pick<ProductImage, "id" | "position">;

export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position");

  if (error) throw error;
  return data as ProductImage[];
}

export async function fetchProductImagePositions(productId: string): Promise<ProductImagePosition[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, position")
    .eq("product_id", productId)
    .order("position");

  if (error) throw error;
  return (data ?? []) as ProductImagePosition[];
}

export function hasSequentialPositions(images: ProductImagePosition[]) {
  return images.every((image, index) => image.position === index + 1);
}

export async function syncMainImage(productId: string) {
  const images = await fetchProductImages(productId);
  const mainUrl = images[0]?.image_url ?? null;

  const { error } = await supabase.from("products").update({ image_url: mainUrl }).eq("id", productId);
  if (error) throw error;
}

export async function renormalizePositions(orderedIds: string[]) {
  const OFFSET = 1000;

  const temporaryUpdates = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("product_images").update({ position: OFFSET + index + 1 }).eq("id", id)
    )
  );
  const temporaryError = temporaryUpdates.find((result) => result.error)?.error;
  if (temporaryError) throw temporaryError;

  const finalUpdates = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("product_images").update({ position: index + 1 }).eq("id", id)
    )
  );
  const finalError = finalUpdates.find((result) => result.error)?.error;
  if (finalError) throw finalError;
}

export async function ensureSequentialProductImagePositions(productId: string) {
  const images = await fetchProductImagePositions(productId);

  if (images.length === 0 || hasSequentialPositions(images)) {
    return images;
  }

  const orderedIds = images.map((image) => image.id);
  await renormalizePositions(orderedIds);

  return orderedIds.map((id, index) => ({ id, position: index + 1 }));
}