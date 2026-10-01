# Corrigir aviso de e-mail existente no cadastro B2B

## Objetivo
Evitar que a tela informe “Cadastro recebido” quando o e-mail já pertence a uma conta da loja.

## Alterações
- Detectar a resposta de cadastro que indica um e-mail já registrado.
- Exibir claramente que o e-mail já possui uma conta na loja B2C.
- Orientar o usuário a entrar com a senha existente e, após o login, solicitar acesso como representante.
- Manter o e-mail preenchido ao voltar para a entrada.
- Preservar o fluxo atual para e-mails realmente novos: confirmação do e-mail e solicitação pendente para aprovação.

## Validação
- Conferir os dois resultados visuais: e-mail novo e e-mail já cadastrado.
- Verificar compilação e erros da prévia.
