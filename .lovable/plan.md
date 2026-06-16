# Mercado Pago em paralelo (alternância por ambiente)

Objetivo: testar o Mercado Pago com pedidos reais **somente no ambiente de preview/staging**, mantendo a InfinitePay 100% intacta na loja publicada (`loja.kepmabrasil.com.br`). Zero risco de quebrar o checkout atual.

## Como funciona a alternância

O checkout decide qual gateway usar com base na origem (URL):

```text
Origem (window.location.hostname)         Gateway usado
-----------------------------------       --------------
*.lovable.app (preview/staging)     -->   Mercado Pago (em teste)
loja.kepmabrasil.com.br (produção)  -->   InfinitePay (atual, inalterado)
```

Assim, qualquer cliente real continua pagando pela InfinitePay. Só quem acessar o link de preview cairá no Mercado Pago — ideal para você validar de ponta a ponta antes de liberar para todos.

Quando estiver confiante, basta uma linha de configuração para liberar o Mercado Pago em produção (ou rodar 100% InfinitePay novamente). Reversível a qualquer momento.

## Credenciais necessárias

Será preciso o **Access Token do Mercado Pago** (em Suas integrações → sua aplicação → Credenciais). Para os testes no preview, usaremos o **Access Token de teste**; para produção, depois trocamos pelo de produção. O token é guardado com segurança como secret (`MERCADO_PAGO_ACCESS_TOKEN`), nunca no código.

## O que será construído

1. **Nova edge function `create-payment-mp`**
   - Recebe o mesmo payload que a `create-payment` atual (orderId, items, redirectUrl).
   - Cria uma "preference" via API do Mercado Pago (`/checkout/preferences`) com os itens, `external_reference = orderId`, `back_urls` e `notification_url` apontando para o novo webhook.
   - Retorna `payment_url` (o `init_point` do Mercado Pago) — mesma forma de resposta da função atual, então o redirecionamento no front não muda.
   - Grava o id da preference no registro de `payments`.

2. **Novo webhook `mercadopago-webhook`**
   - Recebe a notificação do Mercado Pago (formato leve: id + tipo).
   - Consulta a API do MP para confirmar o status real do pagamento (`approved`).
   - Marca `payments.status = 'paid'` e `orders.status = 'paid'`, usando `external_reference` (orderId) para localizar o pedido.
   - Dispara a **notificação Telegram** de pagamento confirmado, reutilizando exatamente o mesmo fluxo já existente da InfinitePay (mudança de status de pagamento via Telegram).

3. **Marcação do gateway no banco**
   - Migração para adicionar a coluna `gateway` (texto, ex.: `'infinitepay'` / `'mercadopago'`) na tabela `payments`, com default `'infinitepay'`.
   - Permite saber por qual gateway cada pedido foi pago e relatórios futuros.

4. **Ajuste mínimo no `Checkout.tsx`**
   - Pequena função `getGateway()` que decide o gateway pela origem (regra acima), com uma constante de override fácil de editar.
   - Se Mercado Pago: chama `create-payment-mp`; senão: chama `create-payment` (fluxo atual, sem alteração).
   - Toda a lógica de pedido, itens, cupom, desconto, e-mail e Telegram de "pedido criado" permanece idêntica.

5. **`PaymentReturn` / página de retorno**
   - Mercado Pago retorna parâmetros diferentes (`payment_id`, `status`, `external_reference`). A página de retorno passa a reconhecer os dois formatos. A confirmação definitiva continua vindo do webhook (fonte da verdade), evitando marcar como pago indevidamente.

## Garantias de segurança da migração

- A função `create-payment`, o webhook da InfinitePay e o fluxo de produção **não são alterados**.
- Em produção, o gateway continua sendo InfinitePay até você decidir o contrário.
- O Mercado Pago roda isolado no preview, com token de teste primeiro.

## Detalhes técnicos

- `MERCADO_PAGO_ACCESS_TOKEN` como secret (teste, depois produção).
- `create-payment-mp` e `mercadopago-webhook` seguem o padrão das funções atuais (CORS, service role client, validação de input).
- Webhook valida o pagamento consultando a API do MP (não confia só na notificação).
- `notification_url` = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`.
- Reaproveita `notify-telegram-order` (ou o trecho atual de notificação de status) para o aviso de pagamento confirmado.

## Passos após aprovação

1. Solicitar o `MERCADO_PAGO_ACCESS_TOKEN` (teste) via secret.
2. Criar a migração da coluna `gateway`.
3. Criar `create-payment-mp` e `mercadopago-webhook`.
4. Ajustar `Checkout.tsx` e a página de retorno.
5. Testar um pedido completo no preview e validar o Telegram de pagamento confirmado.
