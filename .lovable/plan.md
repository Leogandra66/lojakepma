# Coletar dados do pedido antes do pagamento

Antes de enviar o cliente ao Mercado Pago, vamos coletar e validar os dados necessários para faturar e processar o pedido. As colunas de banco já existem (`orders.customer_*` / `shipping_*` e `profiles`), então **não é preciso migração**.

## Dados coletados

- **Nome / Razão social** (faturamento) — obrigatório
- **CPF / CNPJ** — obrigatório, com validação de formato
- **E-mail** — obrigatório (pré-preenchido com o e-mail da conta)
- **Telefone** — obrigatório
- **Endereço completo**: CEP, rua, número, complemento (opcional), bairro, cidade, estado — obrigatórios exceto complemento

## Como vai funcionar

1. **Pré-preenchimento**: ao abrir o checkout, carregamos o `profiles` do usuário e preenchemos os campos automaticamente quando já houver dados salvos.
2. **CEP automático**: ao digitar o CEP (8 dígitos), consultamos o ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) e preenchemos rua, bairro, cidade e estado; o cliente só completa número e complemento.
3. **Validação** (com Zod, client-side): todos os campos obrigatórios preenchidos, e-mail válido, CPF/CNPJ com tamanho/formato correto, telefone válido. Os botões de pagamento ficam desabilitados até o formulário estar válido.
4. **Ao pagar** (PIX ou Mercado Pago):
   - Gravamos os dados no pedido (`orders.customer_name`, `customer_cpf`, `customer_email`, `customer_phone`, `shipping_zip/street/number/complement/neighborhood/city/state`).
   - Atualizamos o `profiles` do usuário com os mesmos dados, para agilizar próximas compras.
   - Seguimos o fluxo atual (cria order_items, pagamento, notificações, redireciona ao gateway).

## Layout

Um novo bloco "Dados para faturamento e entrega" no `Checkout.tsx`, posicionado acima do resumo do pedido/cupom, usando os componentes `Input`/`Label` já existentes. Os dois botões de pagamento atuais (PIX e Mercado Pago) permanecem, apenas passam a exigir o formulário válido.

## Detalhes técnicos

- Arquivo principal: `src/pages/Checkout.tsx`.
  - Novo estado `form` com os campos e estado de validação.
  - `useEffect` para carregar `profiles` (via `supabase.from("profiles").select().eq("user_id", user.id).maybeSingle()`).
  - Função `lookupCep` para ViaCEP (com tratamento de erro/CEP não encontrado).
  - Schema Zod para validação; helper para detectar CPF (11) vs CNPJ (14) dígitos.
  - No `handleCheckout`, incluir os campos do formulário no `insert` de `orders` e fazer `upsert`/`update` no `profiles`.
- Passar `customer_*` também ao Mercado Pago é opcional; o foco é gravar no pedido e perfil. (Se desejado, depois podemos enviar `payer` na preferência em `create-payment-mp/index.ts`.)

Sem alterações de banco de dados.