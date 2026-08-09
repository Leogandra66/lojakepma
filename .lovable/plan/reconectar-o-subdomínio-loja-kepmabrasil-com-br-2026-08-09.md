# Reconectar o subdomínio loja.kepmabrasil.com.br

## Diagnóstico (verificado agora)

- O DNS do subdomínio está **correto**: `loja.kepmabrasil.com.br` aponta para `185.158.133.1` (IP da Lovable) e o registro TXT `_lovable` de verificação existe na Wix.
- O projeto, porém, **não tem nenhum domínio personalizado conectado** hoje — só o endereço `lojakepma.lovable.app`.
- Ao acessar `https://loja.kepmabrasil.com.br` o servidor responde **421 (Misdirected Request)**: o DNS chega na Lovable, mas nenhum projeto reivindica esse endereço.

Ou seja: o problema não está na Wix. Quando o domínio expirou, a conexão dele com este projeto foi removida no lado da Lovable e precisa ser refeita.

## O que fazer

Isto é uma configuração de painel — não há alteração de código no projeto.

1. Abrir **Configurações do projeto → Domínios**.
2. Clicar em **Conectar domínio** e informar `loja.kepmabrasil.com.br`.
3. Como o DNS já está correto, a verificação deve passar direto (status "Verifying" → "Setting up" → "Active"). Não é preciso mexer na Wix.
4. Se a Lovable exibir um valor TXT `_lovable` **diferente** do que já está publicado, atualizar esse registro no painel de DNS da Wix com o novo valor.
5. Aguardar a emissão do certificado SSL (normalmente alguns minutos) e confirmar que o site abre em HTTPS.

## Observações

- Se quiser que `kepmabrasil.com.br` ou `www` também apontem para a loja, eles precisam ser adicionados como entradas separadas — hoje o domínio raiz aponta para outros IPs (provavelmente o site atual na Wix), então não deve ser alterado sem essa decisão.
- O projeto já está publicado, então a conexão do domínio fica ativa assim que a verificação concluir.
