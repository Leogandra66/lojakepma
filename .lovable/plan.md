# Checkout Pro + Correção do Mercado Pago

## Problema atual (verificado)

Nos últimos 7 dias houve 7 pagamentos com status `failed` e 2 ainda `pending` no Mercado Pago. Os falhos apresentam o código `cc_rejected_high_risk`, ou seja, o próprio Mercado Pago está rejeitando os cartões por regras antifraude. Isso pode estar acontecendo porque:

- O checkout atual não envia dados completos do comprador (endereço, telefone, CPF) para o Mercado Pago, o que aumenta o score de risco.
- A preferência de pagamento é criada sem `payer` nem `shipments`, deixando a análise de risco com poucas informações.
- O retorno do cliente ao site não dá feedback claro quando o cartão é rejeitado, parecendo "erro do site".
- Não existe fallback para outro gateway quando o Mercado Pago recusa.

## Objetivo

Construir um **Checkout Pro** robusto, com:

1. Experiência de checkout unificada e clara.
2. Envio completo dos dados do comprador para o Mercado Pago, reduzindo rejeições por risco.
3. Tratamento explícito de rejeição de cartão, com mensagem amigável e opção de tentar outro cartão/PIX.
4. Fallback automático para PIX/InfinitePay quando o cartão é recusado.
5. Ambiente de teste (sandbox) do Mercado Pago para validar sem dinheiro real, depois chaveado para produção.
6. Logs e diagnóstico acessíveis no admin para entender por que cada pagamento falhou.

## Escopo do plano

### 1. Diagnóstico e configuração

- Verificar se a credencial `MERCADO_PAGO_ACCESS_TOKEN` é de produção ou teste.
- Confirmar se o webhook do Mercado Pago está registrado e respondendo.
- Revisar os pedidos `pending_payment` dos últimos 7 dias para identificar padrões.

### 2. Refatorar a Edge Function `create-payment-mp`

- Receber os dados completos do comprador (nome, e-mail, CPF/CNPJ, telefone, endereço).
- Preencher o objeto `payer` da preferência do Mercado Pago.
- Adicionar `shipments` com o endereço de entrega.
- Manter o split payment funcionando, mas também enviando `payer` em cada parte.
- Melhorar o tratamento de erros da API do Mercado Pago, retornando mensagens úteis para o frontend.
- Salvar metadados de erro detalhados na tabela `payments`.

### 3. Criar a página `CheckoutPro.tsx`

- Novo layout em passos: resumo do carrinho → dados pessoais → escolha da forma de pagamento → confirmação.
- Exibir claramente:
  - Valor à vista no PIX (com 10% de desconto).
  - Opção de parcelamento no cartão.
  - Split payment (2 cartões ou cartão + PIX).
- Validar CPF/CNPJ, CEP, telefone e e-mail com mensagens em português.
- Ao clicar em pagar, mostrar loading e, em caso de erro, mensagem específica.

### 4. Melhorar `PaymentReturn.tsx`

- Detectar quando o pagamento foi rejeitado (`cc_rejected_high_risk` ou outros).
- Mostrar tela de "Cartão recusado" com opções:
  - Tentar outro cartão.
  - Pagar com PIX (com desconto).
  - Voltar ao checkout.
- Garantir que pedidos aprovados sejam atualizados corretamente.

### 5. Fallback e retry

- Se o Mercado Pago rejeitar o cartão, oferecer PIX com desconto como alternativa imediata.
- Manter a opção de split payment, mas só habilitar quando for viável.
- Se o Mercado Pago estiver indisponível, mostrar erro claro e não deixar o pedido preso.

### 6. Ambiente sandbox → produção

- Adicionar configuração por secret/environment para alternar entre:
  - `MERCADO_PAGO_ACCESS_TOKEN` (produção)
  - `MERCADO_PAGO_TEST_ACCESS_TOKEN` (teste/sandbox)
- No preview/localhost usar automaticamente o token de teste.
- Em produção (`loja.kepmabrasil.com.br`) usar o token de produção.
- Documentar no admin qual ambiente está ativo.

### 7. Logs e diagnóstico no admin

- Na tela `AdminOrderDetail.tsx`, exibir:
  - Resposta completa do Mercado Pago (status, `status_detail`, `id`).
  - Preferência criada e data/hora.
  - Erros de criação do pagamento.

### 8. Testes

- Testar criação de pagamento com cartão de teste do Mercado Pago.
- Testar rejeição de cartão e fluxo de fallback para PIX.
- Testar split payment.
- Testar webhook de confirmação.
- Validar que pedidos aprovados são marcados como `paid`.

## Entregáveis

- `src/pages/CheckoutPro.tsx` (novo checkout)
- Refatoração de `supabase/functions/create-payment-mp/index.ts`
- Atualização de `src/pages/PaymentReturn.tsx`
- Atualização de `src/pages/admin/AdminOrderDetail.tsx`
- Configuração de secrets para ambiente sandbox/produção
- Testes end-to-end no fluxo completo

## O que não está no escopo

- Alterar o gateway principal para outro que não seja Mercado Pago/InfinitePay.
- Refazer o carrinho ou catálogo de produtos.
- Criar nova tabela no banco (serão usadas `orders`, `payments`, `order_payment_parts` e `profiles` existentes).
