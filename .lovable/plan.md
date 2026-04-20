
Agora com a documentação clara, vamos implementar o webhook da InfinitePay de forma simples e direta.

## Análise

A InfinitePay envia um POST para a `webhook_url` quando o pagamento é aprovado, com payload contendo `transaction_nsu`, `order_nsu` (= nosso `orderId`), `invoice_slug`, `paid_amount`, `capture_method`, `receipt_url` e `items`.

**Pontos importantes:**
- Não há mecanismo de assinatura/secret descrito — só precisamos responder 200 rápido
- O `order_nsu` é o nosso `orderId` (já enviamos isso em `create-payment`)
- A documentação só menciona evento de **aprovação** (não há failed/refunded explícito)
- A URL pública do webhook precisa ser uma Edge Function — `https://lojakepma.lovable.app/webhook` é uma rota do site React, que não recebe POST. Vou esclarecer isso abaixo.

## Plano

### 1. Criar Edge Function `infinitepay-webhook`
Arquivo: `supabase/functions/infinitepay-webhook/index.ts`
- Pública (`verify_jwt = false`)
- Recebe POST com o payload da InfinitePay
- Localiza pagamento por `transaction_nsu` (fallback: `order_id` via `order_nsu`)
- Atualiza `payments`: `status='paid'`, `paid_at=now()`, `transaction_nsu`, `slug`, `capture_method`, `receipt_url`
- Atualiza `orders.status='paid'`
- Loga payload completo para debug
- Sempre responde rápido: 200 em sucesso, 400 só em payload claramente inválido

### 2. Atualizar `create-payment` para enviar `webhook_url`
Arquivo: `supabase/functions/create-payment/index.ts`
- Adicionar `webhook_url` no payload enviado para a InfinitePay, apontando para a Edge Function:
  ```
  https://futrahzhqdvqwvuxlbqf.supabase.co/functions/v1/infinitepay-webhook
  ```

### 3. Registrar função em `supabase/config.toml`
```toml
[functions.infinitepay-webhook]
verify_jwt = false
```

## Sobre a URL `https://lojakepma.lovable.app/webhook`

Essa URL é uma rota do seu site React (frontend), que **não consegue receber POST nem processar requisições de servidor**. O webhook precisa apontar para uma Edge Function (backend). Vou usar:

```
https://futrahzhqdvqwvuxlbqf.supabase.co/functions/v1/infinitepay-webhook
```

Essa será a URL configurada automaticamente no payload de criação do pagamento — você não precisa colar nada no painel da InfinitePay, pois enviamos via API a cada checkout.

## Arquivos
- **novo:** `supabase/functions/infinitepay-webhook/index.ts`
- **editar:** `supabase/functions/create-payment/index.ts` (adicionar `webhook_url`)
- **editar:** `supabase/config.toml` (registrar função sem JWT)

## Próximos passos após implementação
1. Faça um pagamento de teste com cartão
2. Verificamos os logs da função `infinitepay-webhook` para confirmar recebimento e mapeamento
3. Confirmamos que `payments.status` mudou para `paid` e `orders.status` também
