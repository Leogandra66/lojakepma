

# Plano: Importar Produtos do Site loja.kepmabrasil.com.br

## Resumo

Vou extrair os dados de todos os produtos listados no site atual da Kepma Brasil e inserir no banco de dados da nova loja. Isso inclui nome, preço, imagem e categoria de cada produto.

## Produtos identificados no site

| Produto | Preço | Categoria |
|---------|-------|-----------|
| Violão Kepma EDC Plus K1 WAM | R$ 2.590,00 | EDC Plus |
| Violão Kepma F0B Fênix Elfin CRM | R$ 3.600,00 | F0B Fênix |
| Violão Kepma EDC Plus acústico | R$ 1.890,00 | EDC Plus |
| Violão Kepma F0B Fênix CRM - Acústico | R$ 2.800,00 | F0B Fênix |
| Violão Kepma EAC Plus K10 BKM | R$ 2.590,00 | EDC Plus |
| Violão Kepma F0B Fênix CRM - Acústico (variante) | R$ 2.800,00 | F0B Fênix |
| Violão Kepma F0 Pro NM - Eletrônica Elfin | R$ 5.900,00 | F0 Pro |
| Violão Kepma A1E D WS | R$ 12.500,00 | A1 |
| Violão Kepma F0B Fênix Elfin NM | R$ 3.600,00 | F0B Fênix |

## O que será feito

1. **Criar um script** que insere os 9 produtos no banco de dados via migration SQL, com nome, preço, imagem (URL do CDN original), categoria e status `in_stock`
2. **Evitar duplicatas** — verificar os 4 produtos que já existem no banco e não duplicá-los (atualizar se necessário)
3. **Buscar descrições** — acessar as páginas individuais de cada produto para extrair a descrição completa, quando disponível

## Detalhes técnicos

- Inserção via migration SQL usando `INSERT ... ON CONFLICT` para evitar duplicatas
- As imagens usarão as URLs do CDN da Loja Integrada (cdn.awsli.com.br) por enquanto — depois podem ser migradas para o storage próprio
- Todos os produtos serão inseridos com `status = 'in_stock'` e `stock_quantity = 10` como padrão

