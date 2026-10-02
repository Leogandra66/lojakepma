# PDF de pedidos B2B

## Objetivo
Permitir que o representante baixe um PDF comercial de qualquer pedido na aba **Pedidos**, gerado integralmente no navegador e sem consumo de créditos por emissão.

## Entregas
- Adicionar a ação **Baixar PDF** nos detalhes de cada pedido.
- Gerar um documento A4 com identidade Kepma, número, data, status e condição de pagamento.
- Incluir dados do representante e dados completos do cliente, com CNPJ, inscrição estadual e endereço.
- Listar produtos, códigos, quantidades, valores unitários e totais já registrados no pedido.
- Indicar o desconto comercial de 14% quando o cliente for de fora de Minas Gerais.
- Incluir total, observações e paginação, com quebra automática para pedidos longos.
- Usar geração local com `jsPDF` e `jspdf-autotable`; nenhum arquivo será enviado a serviço externo.

## Validação
- Conferir o botão e o download em computador e celular.
- Gerar um pedido com múltiplos itens e inspecionar visualmente todas as páginas do PDF.
- Confirmar que os dados exibidos vêm do pedido salvo e que a loja B2C permanece inalterada.

## Detalhes técnicos
- A geração ficará isolada em um utilitário do módulo B2B.
- O PDF usará os snapshots de preço e condição já salvos no pedido, evitando recalcular valores históricos.
- O logotipo será convertido localmente para inclusão no arquivo.
