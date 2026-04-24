// Meta Product Feed (RSS 2.0 com namespace g:) para Instagram Shopping / Facebook Catalog
// URL pública: https://<project>.supabase.co/functions/v1/meta-catalog-feed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_BASE = "https://loja.kepmabrasil.com.br";
const STORE_TITLE = "Kepma Brasil";
const STORE_DESC = "Catálogo oficial Kepma Brasil — violões, guitarras e acessórios.";
const BRAND = "Kepma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  // Para descrições longas: usa CDATA mas escapa o terminador caso apareça
  const safe = (s ?? "").replace(/\]\]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

function absoluteImage(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE_BASE}${url}`;
  return `${SITE_BASE}/${url}`;
}

function formatPriceBRL(price: number | string): string {
  const n = typeof price === "number" ? price : parseFloat(String(price));
  if (Number.isNaN(n)) return "0.00 BRL";
  return `${n.toFixed(2)} BRL`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // Carrega produtos ativos
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, category, status, stock_quantity, active")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Carrega imagens adicionais para todos os produtos de uma vez
    const ids = (products ?? []).map((p) => p.id);
    const imagesByProduct: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: imgs } = await supabase
        .from("product_images")
        .select("product_id, image_url, position")
        .in("product_id", ids)
        .order("position", { ascending: true });
      for (const row of imgs ?? []) {
        const arr = imagesByProduct[row.product_id] ?? [];
        arr.push(absoluteImage(row.image_url));
        imagesByProduct[row.product_id] = arr;
      }
    }

    const items = (products ?? [])
      .map((p) => {
        const mainImage = absoluteImage(p.image_url ?? imagesByProduct[p.id]?.[0] ?? "");
        if (!mainImage) return ""; // Meta exige image_link

        const inStock = p.status === "in_stock" && (p.stock_quantity ?? 0) > 0;
        const availability = inStock ? "in stock" : "out of stock";

        // Imagens adicionais: tira a primeira (já é a principal) e limita a 10
        const additional = (imagesByProduct[p.id] ?? [])
          .filter((u) => u && u !== mainImage)
          .slice(0, 10)
          .map((u) => `      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`)
          .join("\n");

        const description = (p.description ?? p.name ?? "").trim();
        const category = (p.category ?? "Instrumentos Musicais").trim();

        return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${cdata(p.name ?? "")}</g:title>
      <g:description>${cdata(description)}</g:description>
      <g:link>${escapeXml(`${SITE_BASE}/produto/${p.id}`)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additional}
      <g:availability>${availability}</g:availability>
      <g:price>${formatPriceBRL(p.price)}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(BRAND)}</g:brand>
      <g:product_type>${cdata(category)}</g:product_type>
      <g:google_product_category>Arts &amp; Entertainment &gt; Hobbies &amp; Creative Arts &gt; Musical Instruments</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
      })
      .filter(Boolean)
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(STORE_TITLE)}</title>
    <link>${escapeXml(SITE_BASE)}</link>
    <description>${escapeXml(STORE_DESC)}</description>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("meta-catalog-feed error:", message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${escapeXml(message)}</error>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  }
});
