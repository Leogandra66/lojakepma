# Auditoria e correção do fluxo de pagamento

## Situação atual
- O checkout está configurado para usar **Mercado Pago** em 100% dos casos (gateway hardcoded como `mercadopago` em `src/pages/Checkout.tsx`, linha 527).
- Existem pagamentos recentes com status `failed` no Mercado Pago (pedido `3f3b9527-...`, duas tentativas falhas) e um pedido pendente (`cd18ae23-...`).
- O secret `MERCADO_PAGO_ACCESS_TOKEN` está configurado.
- Não há logs de erro recentes nas edge functions `create-payment-mp` e `mercadopago-webhook`.

## Objetivo
Descobrir por que clientes estão relatando que "o pagamento não funciona" e corrigir as causas encontradas.

## Etapas do plano

### 1. Verificar credenciais do Mercado Pago
- Confirmar se o `MERCADO_PAGO_ACCESS_TOKEN` é de produção (para loja.kepmabrasil.com.br) e não de sandbox/teste.
- Se for token de teste, solicitar/atualizar para token de produção.

### 2. Auditar logs e notificações
- Verificar logs detalhados das edge functions `create-payment-mp` e `mercadopago-webhook` com filtros amplos (não apenas "error").
- Confirmar se o webhook do Mercado Pago está registrado e respondendo corretamente (endpoint `/functions/v1/mercadopago-webhook`).
- Verificar no painel do Mercado Pago se as notificações (IPN/webhook) estão sendo entregues e se há falhas.

### 3. Reproduzir e testar o fluxo
- Fazer um checkout de teste no ambiente de preview com valor baixo.
- Verificar se a preferência é criada, se a URL de pagamento abre e se o retorno atualiza o pedido.
- Testar os 3 modos: pagamento único com cartão, PIX e pagamento dividido.

### 4. Corrigir problemas identificados
Após a auditoria, ajustar:
- Edge function `create-payment-mp` (criação da preferência, tratamento de erros, CORS).
- Edge function `mercadopago-webhook` (mapeamento de status, atualização de pedidos/pagamentos).
- Tela `Checkout.tsx` (seleção de gateway, cálculos de desconto, mensagens de erro).
- Tela `PaymentReturn.tsx` (fluxo de retorno e split payment).

### 5. Melhorar rastreabilidade
- Adicionar logging mais detalhado nas edge functions (payload de erro do Mercado Pago, IDs de preferência/pagamento).
- Considerar salvar mensagem de erro do gateway na tabela `payments` (nova coluna ou usar `metadata`) para diagnóstico futuro.

## Resultado esperado
- Confirmação clara de que o ambiente (produção/teste) do Mercado Pago está correto.
- Fluxo de checkout funcional nos três modos (cartão, PIX e dividido).
- Pedidos sendo atualizados corretamente após pagamento aprovado ou recusado.
- Logs suficientes para diagnosticar problemas futuros sem depender de adivinhação.
