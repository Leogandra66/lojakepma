# Página pública de estoque para representantes

## Objetivo
Criar uma página discreta, acessível apenas pelo link compartilhado, para consultar e exportar a posição de estoque.

## Entrega
- Listar todos os produtos ativos, inclusive com estoque zero.
- Excluir a categoria Eletrônica e produtos desativados.
- Mostrar nome, código Bling, descrição, quantidade e URLs de todas as imagens.
- Permitir busca por nome ou código.
- Exportar os dados exibidos para um arquivo Excel organizado, com uma coluna por imagem.
- Usar uma URL longa, sem links nos menus, com bloqueio de indexação por buscadores.
- Preparar o arquivo em formato neutro, mantendo o código Bling como identificador para futura adaptação à planilha-modelo do Mercos.

## Detalhes técnicos
- A página consultará diretamente o catálogo público atual para refletir as sincronizações de estoque.
- A exportação será gerada no navegador, sem armazenar arquivos ou dados adicionais.
- A URL será `/estoque/representantes/kepma-posicao-7f3c9a82-2026`.
