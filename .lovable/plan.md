## Objetivo

Criar uma loja **B2B (atacado)** em uma **URL separada**, usando o **mesmo banco de produtos** da loja atual, com:
- Preços de atacado **só visíveis após login**.
- **Cadastro de lojista** e **cadastro de representante**.
- **Aprovação manual** do admin antes de liberar preços.
- Representante pode **fazer pedidos por um lojista** (escolhendo um existente OU cadastrando um novo na hora).
- **Zero interferência** na loja B2C atual.

## Como garantir que a loja atual NÃO seja afetada

- A loja B2B será um **projeto Lovable separado** (URL própria), conectado ao **mesmo banco de dados** desta loja.
- Todas as mudanças no banco são **aditivas**: colunas novas (sempre opcionais) e tabelas novas. Nenhuma coluna/tabela existente é alterada ou removida.
- A loja atual simplesmente **ignora** os novos campos. O comportamento dela permanece idêntico.

## Etapa 1 — Preparar o banco compartilhado (feito aqui, neste projeto)

Tudo aditivo e seguro:

1. **Preço de atacado por produto**
   - Adicionar coluna `wholesale_price` (opcional) na tabela `products`.
   - A loja B2C não usa esse campo; a loja B2B usa esse valor no lugar do preço normal.

2. **Perfis B2B (lojistas e representantes)**
   - Nova tabela `b2b_accounts`: tipo da conta (`lojista` ou `representante`), dados comerciais (razão social/nome, CNPJ/CPF, telefone, endereço) e status de aprovação (`pendente` / `aprovado` / `recusado`).
   - Ligada ao usuário autenticado (o mesmo sistema de login/senha).

3. **Vínculo representante → lojistas**
   - Nova tabela `b2b_clients` (lojistas geridos por um representante): permite o representante manter sua carteira de clientes e cadastrar novos lojistas.
   - Um lojista pode existir como conta própria (login dele) ou como cliente cadastrado por um representante.

4. **Pedidos B2B**
   - Reaproveitar a tabela `orders` adicionando colunas opcionais: `is_b2b` (marca pedido de atacado), `b2b_account_id` (lojista do pedido) e `placed_by_rep_id` (representante que lançou, quando aplicável).
   - Assim os pedidos B2B ficam separados por um filtro e **não se misturam** com os pedidos da loja atual.

5. **Segurança (RLS) e papéis**
   - Adicionar papéis `representante` e `lojista` ao controle de acesso existente (via `user_roles` / função `has_role`), sem mexer no papel `admin`.
   - Preços de atacado e dados B2B só ficam acessíveis para contas **aprovadas**; cadastros pendentes não enxergam preços.
   - Admin aprova/recusa cadastros e enxerga todos os pedidos B2B.

## Etapa 2 — Construir o app B2B (no novo projeto)

Conectado ao mesmo banco acima:

1. **Autenticação obrigatória**
   - Login/senha (e Google opcional). Nenhum preço aparece sem login.
   - Telas de cadastro com escolha: "Sou lojista" ou "Sou representante".

2. **Fluxo de aprovação**
   - Após cadastro, conta fica **pendente**: usuário vê o catálogo mas **sem preços**, com aviso "aguardando aprovação".
   - Após aprovação do admin, preços de atacado liberam.

3. **Catálogo B2B**
   - Mesma vitrine/estrutura visual da loja atual, lendo os mesmos produtos.
   - Exibe `wholesale_price` em vez do preço varejo.

4. **Pedidos**
   - Lojista: monta o carrinho e finaliza o próprio pedido.
   - Representante: seleciona um lojista da carteira **ou** cadastra um novo lojista na hora, depois monta o pedido em nome dele.

5. **Painel admin B2B**
   - Aprovar/recusar cadastros de lojistas e representantes.
   - Visualizar e gerenciar pedidos B2B (separados dos pedidos B2C).
   - Gerenciar o preço de atacado dos produtos.

## O que você precisará fazer (fora do código)

- Criar o **novo projeto Lovable** para a loja B2B e **conectá-lo a este mesmo banco de dados** (eu te oriento no passo a passo).
- O domínio/URL do B2B (ex.: `atacado.kepmabrasil.com.br`).

## Detalhes técnicos (resumo)

- Banco: `ALTER TABLE products ADD COLUMN wholesale_price` (nullable); novas tabelas `b2b_accounts`, `b2b_clients`; colunas `is_b2b`, `b2b_account_id`, `placed_by_rep_id` em `orders`; novos valores no enum de papéis; políticas RLS novas — tudo aditivo.
- Compartilhamento de banco: o projeto B2B aponta para o mesmo backend Supabase desta loja (mesmos produtos, imagens e estoque em tempo real).
- Risco para a loja atual: nenhum, pois nada existente é modificado, apenas estendido.

## Onde começo

Como este chat é da loja atual, posso **executar a Etapa 1 (preparar o banco compartilhado) aqui mesmo** assim que você aprovar. Depois te passo as instruções para criar o projeto B2B e conectá-lo a este banco, e seguimos com a Etapa 2.
