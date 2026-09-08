# Corrigir a sincronização de estoque do Bling

## O que está acontecendo

Os registros da última sincronização mostram que o Bling recusou todas as chamadas com a mensagem:

"A URL 'www.bling.com.br' está bloqueada para requisições de API. Por favor, utilize o endpoint oficial: 'api.bling.com.br'."

Ou seja: o Bling desativou o endereço antigo que o sistema usa. Nenhum produto é atualizado e a busca do depósito "Geral" também falha.

## Correção

Trocar o endereço usado nas chamadas ao Bling do antigo (`www.bling.com.br/Api/v3`) para o oficial (`api.bling.com.br/Api/v3`) em três pontos:

- Sincronização de estoque (consulta de produtos, saldos e depósitos)
- Renovação automática do token de acesso
- Troca do código de autorização por token, no retorno da conexão

A tela de autorização (a página onde você aprova o acesso no Bling) continua no endereço atual, pois é uma página de navegador e não uma chamada de API.

## Depois da correção

- Publicar as funções atualizadas.
- Rodar "Sincronizar agora" no painel e conferir o resultado: quantos produtos atualizados, não encontrados e com erro.
- Se o token atual estiver expirado, pode ser necessário clicar em "Reconectar Bling" uma vez.

## Detalhes técnicos

- `supabase/functions/bling-sync-stock/index.ts`: `BLING_API` passa a `https://api.bling.com.br/Api/v3`.
- `supabase/functions/bling-oauth-callback/index.ts`: token endpoint passa a `https://api.bling.com.br/Api/v3/oauth/token`.
- `supabase/functions/bling-oauth-start/index.ts`: `authorize` permanece em `www.bling.com.br` (fluxo de navegador).
- Deploy das funções `bling-sync-stock` e `bling-oauth-callback`, seguido de verificação nos logs.
