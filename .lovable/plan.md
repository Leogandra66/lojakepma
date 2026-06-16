# Botão de pagamento via PIX com 10% de desconto

Adicionar um segundo botão no checkout para pagamento via PIX, que aplica 10% de desconto sobre o valor a pagar (somando com cupom, se houver) e leva o cliente a uma página do Mercado Pago que oferece **somente PIX**.

## O que muda para o cliente

Na tela "Finalizar Compra" passarão a existir dois botões:
- **Pagar com Mercado Pago** (atual — todos os meios de pagamento, sem desconto extra)
- **Pagar com PIX — 10% de desconto** (novo)

O resumo do pedido mostrará, abaixo do total atual, o valor com o desconto PIX para o cliente saber quanto economiza.

## Como funciona

1. O desconto PIX (10%) é calculado sobre o `amountDueNow` (valor já com cupom aplicado). Os dois descontos se somam.
2. Ao clicar no botão PIX, o pedido é criado normalmente, porém com o total e o pagamento já refletindo o desconto de 10%.
3. O cliente é redirecionado para a página do Mercado Pago configurada para exibir **apenas PIX**.

## Alterações técnicas

### `src/pages/Checkout.tsx`
- Extrair a lógica de `handleCheckout` para aceitar um parâmetro `pix: boolean`.
- Quando `pix === true`:
  - Calcular `pixDiscount = amountDueNow * 0.10` e `pixAmount = amountDueNow - pixDiscount`.
  - Gravar em `orders`: `total` e `discount_amount` incluindo o desconto PIX (somado ao cupom).
  - Gravar em `payments.amount` o valor com desconto PIX.
  - Aplicar a redução proporcional adicional de 10% sobre os itens enviados (mesma técnica já usada para o cupom, garantindo preço de item > 0).
  - Invocar `create-payment-mp` com uma flag nova `pixOnly: true`.
- Adicionar o segundo botão e uma linha no resumo mostrando "Total no PIX (-10%)".
- Estados de loading separados (ou um identificador) para não travar os dois botões ao mesmo tempo.

### `supabase/functions/create-payment-mp/index.ts`
- Aceitar `pixOnly` no corpo da requisição.
- Quando `pixOnly === true`, adicionar à `preference`:
  ```text
  payment_methods: {
    excluded_payment_types: [
      { id: "credit_card" },
      { id: "debit_card" },
      { id: "ticket" },
      { id: "atm" },
      { id: "prepaid_card" }
    ],
    installments: 1
  }
  ```
  Isso deixa apenas PIX disponível na página do Mercado Pago. O restante do fluxo (preferência, `init_point`, webhook) permanece igual.

## Observações
- Nenhuma mudança de schema é necessária — usamos as colunas existentes `total`, `discount_amount` e `payments.amount`.
- O webhook `mercadopago-webhook` continua funcionando sem alteração (confirma o pagamento pelo `external_reference`).
