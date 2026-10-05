import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const PRODUCT_SELECT = [
  "id",
  "name",
  "description",
  "price",
  "image_url",
  "category",
  "status",
  "stock_quantity",
  "price_b2b",
  "bling_code",
  "ean_gtin",
  "package_weight_kg",
  "package_height_cm",
  "package_width_cm",
  "package_length_cm",
  "preorder_estimated_delivery",
  "video_url",
  "electronics_tag",
  "uses_plek_technology",
  "created_at",
  "updated_at",
].join(",");

function jsonResponse(body: unknown, status = 200, method = "GET"): Response {
  return new Response(method === "HEAD" ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? CACHE_CONTROL : "no-store",
    },
  });
}

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function absoluteUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const siteBase = "https://loja.kepmabrasil.com.br";
  return `${siteBase}/${value.replace(/^\/+/, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return jsonResponse({ error: "Method not allowed" }, 405, req.method);
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim() || null;
    const category = url.searchParams.get("category")?.trim() || null;
    const status = url.searchParams.get("status")?.trim() || null;
    const updatedSince = url.searchParams.get("updated_since")?.trim() || null;
    const page = parsePositiveInteger(url.searchParams.get("page"), 1);
    const requestedLimit = parsePositiveInteger(url.searchParams.get("limit"), DEFAULT_LIMIT);

    if (page === null || requestedLimit === null) {
      return jsonResponse({ error: "page and limit must be positive integers" }, 400, req.method);
    }
    if (id && !isUuid(id)) {
      return jsonResponse({ error: "id must be a valid UUID" }, 400, req.method);
    }
    if (category && category.length > 100) {
      return jsonResponse({ error: "category is too long" }, 400, req.method);
    }
    const allowedStatuses = new Set(["in_stock", "preorder", "unavailable"]);
    if (status && !allowedStatuses.has(status)) {
      return jsonResponse({ error: "status must be in_stock, preorder, or unavailable" }, 400, req.method);
    }
    let updatedSinceIso: string | null = null;
    if (updatedSince) {
      const parsedDate = new Date(updatedSince);
      if (Number.isNaN(parsedDate.getTime())) {
        return jsonResponse({ error: "updated_since must be a valid date" }, 400, req.method);
      }
      updatedSinceIso = parsedDate.toISOString();
    }

    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    let productsQuery = client
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("active", true)
      .not("ean_gtin", "is", null)
      .neq("ean_gtin", "");

    if (id) productsQuery = productsQuery.eq("id", id);
    if (category) productsQuery = productsQuery.eq("category", category);
    if (status) productsQuery = productsQuery.eq("status", status);
    if (updatedSinceIso) productsQuery = productsQuery.gte("updated_at", updatedSinceIso);

    const { data: products, error: productsError, count } = await productsQuery
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (productsError) throw productsError;

    const productIds = (products ?? []).map((product) => product.id);
    const imagesByProduct = new Map<string, Array<{ id: string; url: string; position: number }>>();

    if (productIds.length > 0) {
      const { data: images, error: imagesError } = await client
        .from("product_images")
        .select("id, product_id, image_url, position")
        .in("product_id", productIds)
        .order("position", { ascending: true });

      if (imagesError) throw imagesError;

      for (const image of images ?? []) {
        const list = imagesByProduct.get(image.product_id) ?? [];
        const imageUrl = absoluteUrl(image.image_url);
        if (imageUrl) list.push({ id: image.id, url: imageUrl, position: image.position });
        imagesByProduct.set(image.product_id, list);
      }
    }

    const data = (products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      price_b2b: product.price_b2b === null ? null : Number(product.price_b2b),
      bling_sku: product.bling_code,
      ean_gtin: product.ean_gtin,
      package_weight_kg: product.package_weight_kg === null ? null : Number(product.package_weight_kg),
      package_dimensions_cm: {
        height: product.package_height_cm === null ? null : Number(product.package_height_cm),
        width: product.package_width_cm === null ? null : Number(product.package_width_cm),
        length: product.package_length_cm === null ? null : Number(product.package_length_cm),
      },
      status: product.status,
      stock_quantity: product.stock_quantity,
      preorder_estimated_delivery: product.preorder_estimated_delivery,
      electronics_tag: product.electronics_tag,
      uses_plek_technology: product.uses_plek_technology,
      video_url: product.video_url,
      main_image: absoluteUrl(product.image_url),
      images: imagesByProduct.get(product.id) ?? [],
      created_at: product.created_at,
      updated_at: product.updated_at,
    }));

    const total = count ?? 0;
    return jsonResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    }, 200, req.method);
  } catch (error) {
    console.error("products-api error", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Unable to load products" }, 500, req.method);
  }
});