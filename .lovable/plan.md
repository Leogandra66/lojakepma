# Completar o cadastro de clientes B2B

## Implementação
- Tornar obrigatórios no cadastro e na edição: razão social/nome, CNPJ, inscrição estadual, pessoa de contato, telefone, e-mail, CEP, rua, número, bairro, cidade e estado.
- Manter somente o complemento do endereço como opcional.
- Substituir o campo livre de estado por uma lista com as 27 UFs brasileiras.
- Preservar clientes antigos incompletos, mas exigir que sejam completados quando forem editados.
- Aplicar as mesmas validações no formulário e no banco, sem alterar a loja B2C.

## Validação
- Confirmar que o formulário bloqueia campos obrigatórios vazios, aceita complemento vazio e salva uma UF válida.
- Verificar o cadastro em computador e celular e confirmar que o projeto continua carregando sem erros.
