# Sincronização de estoque do Bling → Loja (via Webhook)

## Objetivo
Quando o estoque de um produto mudar no Bling (ERP), o Bling envia um webhook para a loja e o `stock_quantity` da tabela `products` é atualizado automaticamente, em tempo real.

## Como vai funcionar (visão geral)
```text
Bling (estoque muda)
      │  envia webhook (HTTP POST)
      ▼
Edge Function pública "bling-stock-webhook"
      │  valida segredo + identifica produto pelo código (SKU)
      ▼
Atualiza products.stock_quantity (e status, se zerar)
```

## 1. Banco de dados (migration)
- Adicionar à tabela `products`:
  - `bling_code TEXT` — o código/SKU do produto no Bling (chave de ligação). Com índice único parcial (permite produtos sem código ainda).
  - `stock_synced_at TIMESTAMPTZ` — registra a última atualização vinda do Bling (para auditoria/diagnóstico).
- Sem mudança de RLS: a edge function usa a service role para atualizar.

## 2. Edge Function `bling-stock-webhook` (pública, `verify_jwt = false`)
- Recebe o POST do Bling.
- **Segurança**: valida um segredo próprio enviado na URL (ex.: `?token=...`) contra o secret `BLING_WEBHOOK_SECRET`. Sem token válido → 401.
- Lê o payload do Bling (evento de estoque), extrai o **código do produto** e o **saldo atual**.
- Faz `UPDATE products SET stock_quantity = <saldo>, stock_synced_at = now() WHERE bling_code = <código>`.
- Regra de status: se saldo = 0 → `status = 'unavailable'`; se saldo > 0 e produto estava indisponível → opcional voltar para `available` (a confirmar com você na implementação).
- Sempre responde 200 rápido para o Bling (mesmo quando o produto não é encontrado, apenas loga), evitando reenvios infinitos.
- Trata os dois formatos de payload que o Bling pode mandar (com saldo no corpo, ou só com o ID exigindo consulta — ver seção 4).

## 3. Painel Admin
- Em `src/pages/admin/AdminProducts.tsx`: adicionar o campo **"Código Bling (SKU)"** no formulário de criar/editar produto e exibir na tabela. É o que liga cada produto da loja ao Bling.

## 4. Credenciais do Bling (a confirmar na implementação)
Dois cenários, dependendo do que o webhook do Bling entrega:
- **Cenário simples**: o webhook já traz o saldo no corpo → não precisamos chamar a API do Bling. Só precisamos do `BLING_WEBHOOK_SECRET` (gerado por nós).
- **Cenário com consulta**: se o webhook trouxer apenas o ID do produto, a função precisa consultar a API v3 do Bling para obter o saldo. Nesse caso precisaremos das credenciais OAuth2 do Bling (`client_id`, `client_secret`) e armazenar/renovar o token de acesso. Isso adiciona um fluxo de autorização inicial.

Começaremos pelo cenário simples (webhook com saldo). Se o seu app no Bling só mandar o ID, ativamos o fluxo OAuth2 depois.

## 5. Configuração que você fará no Bling
Depois de implementado, você cadastra no Bling um webhook apontando para a URL da edge function (eu te passo a URL final, com o token de segurança).

## Detalhes técnicos
- Secret novo: `BLING_WEBHOOK_SECRET` (gerado automaticamente).
- Edge function sem JWT (endpoint público chamado por servidor externo), protegida por token na URL.
- Atualização via service role (ignora RLS) apenas dentro da função.
- Tabela `products` ganha `bling_code` (único) e `stock_synced_at`.

## Fora de escopo (por enquanto)
- Sincronizar preço, nome ou criar produtos novos a partir do Bling.
- Importação inicial em massa do estoque (pode ser adicionada depois com o fluxo OAuth2).
