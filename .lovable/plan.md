## Problema

Uma venda foi paga (o dinheiro chegou ao Mercado Pago), mas o pedido continuou como **"Aguardando pagamento"**. Hoje a atualização do status depende 100% do webhook do Mercado Pago. Quando essa notificação não chega (ou falha — atraso, instabilidade, retry perdido), o pedido fica preso para sempre, sem nenhuma forma de corrigir além de mudar o status na mão (o que não registra o pagamento de verdade).

Confirmei no banco: a cliente fez várias tentativas de checkout (cada clique gera um novo pedido) e todos estão `pending_payment`, apesar do pagamento existir no Mercado Pago.

## Solução

Criar um mecanismo de **reconferência** que consulta o Mercado Pago e atualiza o pedido — usado tanto manualmente quanto de forma automática.

### 1. Nova função de backend `mercadopago-reconcile`
- Recebe o `order_id` de um pedido.
- Consulta a API de busca do Mercado Pago pelos pagamentos daquele pedido (`/v1/payments/search?external_reference={order_id}`).
- Aplica exatamente a mesma lógica do webhook atual: mapeia o status do Mercado Pago (`approved` → pago, `rejected`/`cancelled` → falhou, etc.), atualiza a tabela de pagamentos (com `paid_at`, comprovante, NSU) e marca o pedido como **Pago** quando confirmado.
- Dispara a notificação no Telegram quando o pagamento passa a pago, igual ao fluxo atual.
- Responde dizendo o que encontrou (ex.: "pagamento aprovado, pedido atualizado" ou "nenhum pagamento aprovado encontrado").

### 2. Botão no detalhe do pedido (admin)
- Na tela de detalhe do pedido, adicionar o botão **"Verificar pagamento no Mercado Pago"**.
- Ao clicar, chama a função acima e atualiza a tela com o resultado (toast de sucesso/erro e recarregamento dos dados).
- Assim, para o pedido que está preso agora, basta abrir e clicar — ele será corrigido na hora.

### 3. Reconferência automática (rede de segurança)
- Um processo periódico que, a cada intervalo, pega pedidos recentes ainda em "Aguardando pagamento" (ex.: criados nas últimas 24–48h) e roda a reconferência neles automaticamente.
- Isso garante que, mesmo se o webhook falhar de novo, o pedido será atualizado sozinho em poucos minutos, sem ação manual.

## Detalhes técnicos

- A função reutiliza `MERCADO_PAGO_ACCESS_TOKEN` (já configurado) e o mapeamento de status do `mercadopago-webhook`. Para evitar duplicação, a lógica de "aplicar status de um pagamento MP ao pedido" será compartilhada entre o webhook e a reconferência.
- A função usa a service role para atualizar pedidos/pagamentos e responde com CORS para ser chamada do painel admin (com validação de admin via JWT).
- A reconferência automática usará agendamento (cron) no backend chamando a função para pedidos pendentes recentes.
- Nenhuma mudança no fluxo de checkout do cliente — só adiciona caminhos de recuperação.

## Fora do escopo
- Não altera o fluxo de criação de pagamento nem o webhook existente (ele continua funcionando como caminho principal).
- Não mexe na duplicação de pedidos por múltiplos cliques (pode ser tratado depois, se desejar).
