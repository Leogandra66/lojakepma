## Gerar feed XML de catálogo para Meta / Instagram Shopping

### Objetivo
Criar uma URL pública e estável que retorna o catálogo da loja em **XML no formato Meta Product Feed (RSS 2.0 com namespace `g:`)**. Essa URL é o que você vai colar no Meta Commerce Manager para alimentar o catálogo do Instagram Shopping da @kepmabrasil.

### O que será criado

**1. Edge function pública: `meta-catalog-feed`**
- URL final: `https://futrahzhqdvqwvuxlbqf.supabase.co/functions/v1/meta-catalog-feed`
- Sem autenticação (público — `verify_jwt = false`), porque a Meta precisa conseguir ler o feed sem login.
- Lê todos os produtos com `active = true` direto do banco.
- Retorna `Content-Type: application/xml`.
- Cache de 1 hora (`Cache-Control: public, max-age=3600`) para não sobrecarregar.

**2. Formato do XML (padrão exigido pela Meta)**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Kepma Brasil</title>
    <link>https://loja.kepmabrasil.com.br</link>
    <description>Catálogo oficial Kepma Brasil</description>
    <item>
      <g:id>{product.id}</g:id>
      <g:title>{product.name}</g:title>
      <g:description>{product.description}</g:description>
      <g:link>https://loja.kepmabrasil.com.br/produto/{product.id}</g:link>
      <g:image_link>{product.image_url}</g:image_link>
      <g:availability>in stock | out of stock</g:availability>
      <g:price>3600.00 BRL</g:price>
      <g:condition>new</g:condition>
      <g:brand>Kepma</g:brand>
      <g:product_type>{product.category}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
    </item>
    <!-- ... um <item> por produto ... -->
  </channel>
</rss>
```

**3. Regras de mapeamento dos campos**
- `availability`: `in stock` se `status = 'in_stock'` e `stock_quantity > 0`, senão `out of stock`.
- `price`: sempre `"{valor} BRL"` (ex: `"3600.00 BRL"`).
- `image_link`: usa `image_url` principal. Imagens adicionais de `product_images` viram `<g:additional_image_link>` (até 10).
- Caracteres especiais em título/descrição são escapados (`&`, `<`, `>`, `"`, `'`).
- Produtos com `active = false` são ignorados.
- `identifier_exists = no` (não temos GTIN/MPN cadastrados).

### O que VOCÊ precisa fazer depois (eu não consigo)
1. No **Meta Business Suite** → desconectar o catálogo da outra loja que está hoje vinculado ao Instagram @kepmabrasil.
2. Em **Commerce Manager → Catálogos → Criar catálogo → Fonte de dados → Feed de dados agendado**.
3. Colar a URL: `https://futrahzhqdvqwvuxlbqf.supabase.co/functions/v1/meta-catalog-feed`.
4. Configurar atualização automática (diária recomendada).
5. Conectar o catálogo ao Instagram da @kepmabrasil.
6. Aguardar aprovação do Instagram Shopping pela Meta.

### Detalhes técnicos
- **Arquivos novos**: `supabase/functions/meta-catalog-feed/index.ts` e bloco `[functions.meta-catalog-feed] verify_jwt = false` em `supabase/config.toml`.
- **Sem mudanças no banco**, sem novas dependências, sem alterações no frontend.
- **Sem segredos novos** — usa apenas `SUPABASE_URL` e `SUPABASE_ANON_KEY` que já existem.
- **Custo**: praticamente zero (uma chamada por hora no máximo, vinda dos crawlers da Meta).

### Resultado
Após a aprovação, você vai ter o feed gerando automaticamente. Toda vez que cadastrar/editar um produto no admin, ele aparece no XML na próxima leitura da Meta — sem trabalho manual.
