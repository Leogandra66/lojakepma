
## Passo 0 — Corrigir erros de build (recharts v3)

O upgrade do `recharts` para v3 mudou a tipagem de `Tooltip`/`Legend`. Ajustar `src/components/ui/chart.tsx`:

- `ChartTooltipContent`: tipar via `React.ComponentProps<typeof RechartsPrimitive.Tooltip>` estendido, e tratar `payload` como `Array<any>` (v3 tornou opcional/unknown).
- `ChartLegendContent`: tipar via `React.ComponentProps<typeof RechartsPrimitive.Legend>` em vez de `Omit<..., "payload" | "verticalAlign">` sobre `HTMLAttributes`, resolvendo o TS2344.
- Adicionar guards `Array.isArray(payload)` antes de `.length`/`.map`.

Sem mudança de comportamento visual.

## Passo 1 — Como o cliente divide (UI)

Na página de Checkout, após o formulário de endereço, nova seção **"Forma de pagamento"** com 3 opções:

1. Cartão (10x) — fluxo atual
2. Pix à vista (−10%) — fluxo atual
3. **Dividir em 2 formas** — novo

Ao escolher "Dividir", aparecem:

- Seletor de combinação: **Cartão + Pix** ou **Cartão + Cartão**
- Campo "Valor na 1ª forma (R$)" com máscara BRL. O restante é calculado automaticamente e mostrado ao lado ("2ª forma: R$ X").
- Validação: cada parte ≥ R$ 5,00 e < total; soma = total (após cupom).
- Prévia do que será cobrado:
  - Cartão+Pix: `1ª cartão em até 10x de R$ x/10` + `2ª Pix R$ y × 0,9 = R$ y_final` (desconto só na parte Pix). O total efetivo a pagar aparece em destaque.
  - Cartão+Cartão: cada parte com seu próprio "em até 10x de R$/10".
- Cupom continua incidindo sobre o subtotal antes da divisão (mantém regra atual).

## Passo 2 — Modelo de dados

Migração adicionando ao `orders`:

- `payment_mode text` — `single` | `split`
- `split_config jsonb` — `{ combination: 'card_pix'|'card_card', part1: {method, amount_cents}, part2: {method, amount_cents} }`

Nova tabela `order_payment_parts` (uma linha por parte da divisão):

- `id uuid pk`
- `order_id uuid fk orders`
- `part_index int` (1 ou 2)
- `method text` (`card` | `pix`)
- `amount_cents int` (valor **já com desconto Pix** aplicado quando `method='pix'`)
- `mp_preference_id text`, `mp_payment_id text`, `mp_init_point text`
- `status text` (`pending`|`approved`|`rejected`|`expired`)
- `paid_at timestamptz`
- timestamps + RLS (dono lê; service_role tudo)
- GRANTs conforme regra do projeto

O `orders.status` fica `pending` até **ambas** as partes ficarem `approved`; então vira `paid`. Se uma vencer/rejeitar, permanece `pending` — admin resolve manualmente (Passo 5).

## Passo 3 — Edge Function `create-payment-mp` (extensão)

Aceitar payload `mode: 'split'` com `parts: [{method, amountCents}, {method, amountCents}]`. Fluxo:

1. Cria 1 registro em `order_payment_parts` por parte.
2. Para cada parte, cria uma **preferência MP separada** com `external_reference = "<orderId>:<partIndex>"` e `payment_methods.excluded_payment_types` restringindo ao método daquela parte (`pix` ou cartões).
3. `items` da preferência = 1 item consolidado "Pedido #X — Parte N/2" com `unit_price` = amount da parte (já com −10% quando Pix).
4. Retorna `{ parts: [{partIndex, initPoint}] }`.

Checkout abre a 1ª parte; após retorno do MP (aprovado/pendente/rejeitado), abre a 2ª automaticamente. Se o usuário fechar, ele pode retomar a partir de "Meus Pedidos" (link individual por parte).

## Passo 4 — Webhook `mercadopago-webhook`

- Parse do `external_reference` para extrair `orderId` e `partIndex`.
- Atualiza `order_payment_parts` correspondente.
- Se **ambas** as partes `approved`: marca `orders.status='paid'`, dispara e-mail transacional e Telegram (uma vez, com trava idempotente via `orders.paid_at` nulo).
- Se uma aprovar e a outra rejeitar/expirar: mantém `pending`, envia Telegram de alerta "Pagamento parcial — requer ação".

`mercadopago-reconcile` também passa a iterar por `order_payment_parts` pendentes.

## Passo 5 — Admin

Em `AdminOrderDetail`:

- Nova seção "Pagamento dividido" listando as 2 partes (método, valor, status, id MP, link de retomada).
- Botão **"Estornar parte paga"** (abre confirmação — não executa API, só marca `refunded` para controle; estorno real segue manual no painel MP, pois automação de refund não está no escopo).
- Botão **"Cobrar novamente parte pendente"** que gera nova preferência MP para o valor restante e envia link ao cliente por e-mail.

## Passo 6 — Regras de negócio confirmadas

- Combinações: **Cartão+Pix** e **Cartão+Cartão** (Pix+Pix não).
- Divisão: cliente digita R$ da 1ª forma.
- Cupom: aplicado no subtotal antes da divisão.
- Desconto Pix: 10% incidem **apenas** sobre a parte destinada ao Pix.
- Parcelamento em até 10x mantido em cada parte de cartão (regra por preferência MP).
- Pedido só confirma com as duas partes aprovadas.

## Detalhes técnicos

- Mercado Pago Checkout Pro não suporta split nativo → implementado como **2 preferências independentes** ligadas pelo `external_reference`.
- Idempotência do "marcar pago" via UPDATE condicional `WHERE status='pending' AND paid_at IS NULL`.
- Deduplicação de pedidos (assinatura do carrinho + 24h) já existente ganha nova chave incluindo `payment_mode` e `split_config` para não reaproveitar pedido single como split.
- Tipos regenerados após migração; `src/integrations/supabase/types.ts` é auto-gerado.
