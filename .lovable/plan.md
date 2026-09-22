# Endpoint público de produtos para testes

## Objetivo
Disponibilizar uma consulta pública em JSON para terceiros testarem o acesso ao catálogo, incluindo preço, quantidade em estoque e imagens.

## Implementação
- Criar a função pública `products-api` no backend.
- Retornar somente produtos com `active = true`.
- Incluir os campos públicos do catálogo: identificador, nome, descrição, categoria, preço, situação, quantidade em estoque, previsão de chegada, características, imagem principal, galeria e datas de atualização.
- Não expor o código interno do Bling nem outros dados administrativos.
- Aceitar consulta de um produto por `id` e listagem com filtros por `category`, `status` e `updated_since`.
- Adicionar paginação por `page` e `limit`, com limite máximo por requisição.
- Liberar chamadas de navegadores e responder somente a métodos de leitura (`GET` e `HEAD`).
- Incluir cache curto e informações de paginação na resposta.

## Verificação
- Consultar a lista pública e confirmar produtos, preço, estoque e imagens.
- Testar busca por produto, filtros, paginação e parâmetros inválidos.
- Confirmar que produtos inativos e campos administrativos não aparecem.
