

# Plano: Cupons vinculados a produtos específicos

## Resumo

Permitir que o admin escolha se um cupom vale para **todos os produtos** ou apenas para **produtos específicos**. Ao criar/editar um cupom, haverá a opção de selecionar os produtos elegíveis.

## O que será feito

### 1. Nova tabela no banco de dados
Criar uma tabela `coupon_products` para vincular cupons a produtos específicos:
- `coupon_id` (uuid) — referência ao cupom
- `product_id` (uuid) — referência ao produto
- RLS: admins podem gerenciar, leitura pública

Se a tabela estiver vazia para um cupom, ele vale para todos os produtos.

### 2. Atualizar formulário de cupons (AdminCoupons.tsx)
- Adicionar um switch "Aplicar a todos os produtos" (padrão: sim)
- Quando desativado, exibir lista de produtos com checkboxes para seleção
- Ao salvar, gravar os vínculos na tabela `coupon_products`

### 3. Atualizar validação do cupom no checkout
- Ao aplicar um cupom, verificar se existem registros em `coupon_products`
- Se existirem, o desconto só se aplica aos produtos vinculados no carrinho
- Se não existirem, o cupom vale para todos (comportamento atual)

### 4. Exibir informação na tabela de cupons
- Adicionar coluna "Produtos" na listagem, mostrando "Todos" ou a quantidade de produtos vinculados

## Detalhes técnicos

- Migration SQL para criar `coupon_products` com unique constraint `(coupon_id, product_id)` e RLS policies
- Query de produtos existentes no formulário via `useQuery`
- Lógica de desconto parcial no checkout: calcular subtotal apenas dos itens elegíveis

