## Integração com API do Bling v3 para sincronizar estoque

### Objetivo
Atualizar automaticamente `stock_quantity` na tabela `products` a cada 1 hora, apenas para produtos que têm o campo **Cód. Bling** preenchido. Além disso, um botão manual "Sincronizar agora" no admin.

---

### Passo 1 — Criar o app no Bling (você faz isso)

Antes de eu implementar, você precisa criar um aplicativo no Bling para me fornecer as credenciais OAuth2:

1. Acesse **https://developer.bling.com.br/** e faça login com a conta Bling da empresa.
2. Vá em **Meus Aplicativos → Criar novo aplicativo**.
3. Preencha:
   - **Nome:** Loja Kepma (ou o que preferir)
   - **Categoria:** E-commerce / Integração própria
   - **Link de redirecionamento (Redirect URI):** vou te informar a URL exata assim que a edge function estiver pronta — será algo como
     `https://<projeto>.functions.supabase.co/bling-oauth-callback`
   - **Escopos:** marque pelo menos **Produtos** e **Estoques** (leitura).
4. Ao salvar, o Bling gera **Client ID** e **Client Secret**. Guarde os dois.

> Observação: como o Bling v3 usa OAuth2 com refresh token (validade curta do access token, ~6h), a primeira autorização é feita 1x pelo navegador; depois o sistema renova sozinho.

---

### Passo 2 — O que eu vou implementar (depois que você tiver as credenciais)

**Backend (Lovable Cloud):**
1. **Tabela `bling_auth`** para guardar `access_token`, `refresh_token`, `expires_at` (linha única, protegida por RLS — só service_role).
2. **Edge function `bling-oauth-start`**: gera a URL de autorização do Bling e redireciona.
3. **Edge function `bling-oauth-callback`**: recebe o `code` do Bling, troca por tokens e salva em `bling_auth`.
4. **Edge function `bling-sync-stock`**:
   - Carrega tokens; se expirado, usa `refresh_token` para renovar.
   - Busca em lotes todos os `products` com `bling_code IS NOT NULL AND bling_code <> ''`.
   - Para cada código, consulta `GET /produtos?codigo=<sku>` (ou endpoint de estoque) e atualiza `stock_quantity` + `stock_synced_at`.
   - Se saldo = 0, marca `status = 'unavailable'`; se voltou a ter saldo e estava indisponível, volta para `in_stock` (mesma regra do webhook atual).
   - Respeita o rate limit do Bling (3 req/s) com pequenas pausas entre chamadas.
   - Retorna um resumo (quantos atualizados, quantos não encontrados, quantos com erro).
5. **Cron job (pg_cron + pg_net)** chamando `bling-sync-stock` **a cada 1 hora**.

**Secrets a serem cadastrados:** `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET`.

**Frontend (Admin):**
- Na página **/admin/produtos**, adicionar no topo:
  - Botão **"Conectar Bling"** (aparece só se `bling_auth` estiver vazio) → abre a URL do OAuth.
  - Botão **"Sincronizar estoque agora"** (aparece quando conectado) → chama `bling-sync-stock` e mostra toast com o resumo.
  - Texto pequeno com "Última sincronização: <data/hora>" e "Próxima sincronização automática: em ~X min".
- A coluna atual mostra `Cód. Bling` — nada muda ali.

**Compatibilidade com o que já existe:**
- O webhook `bling-stock-webhook` continua funcionando como está (recebe eventos em tempo real do Bling se você configurar). A sincronização periódica é redundância segura caso um webhook se perca.
- Nenhuma alteração no fluxo de checkout, pedidos ou pagamentos.

---

### Passo 3 — Ordem de execução

1. Você cria o app no Bling e me confirma "criei".
2. Eu implemento a tabela + edge functions + botões e te informo a **Redirect URI exata** para você colar no cadastro do app Bling.
3. Você cola a Redirect URI, pega Client ID + Client Secret, e eu abro o formulário seguro para você salvar.
4. Você clica em **"Conectar Bling"** uma vez no admin, autoriza no site do Bling, é redirecionado de volta.
5. Clica em **"Sincronizar agora"** para o primeiro teste. Se tudo ok, o cron de 1 em 1 hora assume dali em diante.

Me avise quando o app estiver criado no Bling (ou se quiser que eu já implemente os passos 2 em paralelo, sem os secrets — as funções ficam prontas esperando as credenciais).