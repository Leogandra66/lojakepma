# Área B2B para representantes

## Objetivo
Substituir a consulta pública de estoque por uma área comercial protegida, exclusiva para representantes previamente cadastrados. O novo fluxo reutilizará produtos, imagens e estoque atuais, mas manterá clientes, condições e pedidos B2B separados da loja comum.

## Entregas

### 1. Acesso e segurança
- Criar uma entrada exclusiva para representantes, usando e-mail e senha já suportados pela loja.
- Permitir acesso somente a contas do tipo representante com status aprovado.
- Remover o acesso público à página atual e redirecioná-la para a entrada B2B.
- Garantir que cada representante veja e altere somente seus próprios clientes e pedidos.
- Permitir que administradores gerenciem todos os registros B2B.

### 2. Catálogo e preço de atacado
- Adicionar `price_b2b` ao cadastro atual de produtos e ao formulário administrativo.
- Exibir somente produtos ativos, inclusive com estoque zero, excluindo a categoria Eletrônica.
- Manter imagens, código Bling, descrição e estoque compartilhados com o catálogo atual.
- Mostrar preço de atacado apenas para representantes aprovados e administradores.
- Disponibilizar busca e inclusão de quantidades em um pedido B2B próprio, sem reutilizar o carrinho da loja.

### 3. Carteira de clientes
- Criar tela para listar, buscar, cadastrar e editar clientes do representante.
- Registrar razão/nome, documento, contato, telefone, e-mail e endereço.
- Vincular cada cliente ao representante autenticado de forma automática e protegida.

### 4. Condições de pagamento
- Criar cadastro administrativo de prazos comerciais, com nome, descrição, número de parcelas/dias e estado ativo.
- Exibir no pedido somente condições ativas.
- Guardar no pedido uma cópia textual da condição selecionada, preservando o histórico caso ela seja alterada depois.

### 5. Pedidos B2B
- Criar tabelas próprias para pedidos e itens B2B, sem usar pagamentos online e sem misturar com pedidos da loja.
- Vincular obrigatoriamente cada pedido ao representante, ao cliente e à condição escolhida.
- Criar o pedido com status “Aguardando aprovação”.
- Guardar cópia do nome, código, quantidade e preço de atacado de cada produto.
- Validar preço e disponibilidade no banco, sem confiar nos valores enviados pela tela.
- Exibir histórico e detalhes dos pedidos para o representante.

### 6. Aprovação administrativa e estoque
- Criar seção administrativa para representantes, condições e pedidos B2B.
- Permitir aprovar ou recusar pedidos pendentes.
- Ao aprovar, validar novamente o estoque e reservar as quantidades em uma única operação segura.
- Impedir aprovação quando algum item não tiver estoque suficiente.
- Não alterar o fluxo de pagamento, carrinho ou pedidos da loja comum.

## Regras definidas
- Preço comercial: campo `price_b2b` no produto atual.
- Pedido novo: sempre aguarda aprovação administrativa.
- Estoque: somente é reduzido/reservado na aprovação.
- Catálogo: produtos ativos, inclusive estoque zero, exceto Eletrônica.
- Pagamento: nenhum pagamento online; apenas prazo pré-cadastrado.
- Representantes: somente contas previamente cadastradas e aprovadas.

## Detalhes técnicos
- Novas tabelas protegidas para condições, pedidos e itens B2B; reaproveitamento seguro de `b2b_accounts` e `b2b_clients` já existentes.
- Regras de acesso no banco para isolamento por representante e acesso administrativo.
- Operações críticas de criação e aprovação serão transacionais para evitar preços manipulados, pedidos incompletos ou estoque negativo.
- A estrutura de tipos da aplicação será atualizada após as alterações do banco.
- Testes cobrirão bloqueio sem acesso, isolamento entre representantes, criação de cliente, criação de pedido e aprovação com reserva de estoque.
