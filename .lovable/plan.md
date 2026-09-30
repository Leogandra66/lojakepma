# CNPJ e inscrição estadual nos clientes B2B

## Implementação
- Adicionar CNPJ e inscrição estadual obrigatórios aos clientes B2B, preservando os cadastros já existentes sem bloquear a atualização do sistema.
- Validar CNPJ no formulário e no banco; a inscrição estadual aceitará um valor informado ou “Isento”.
- Atualizar cadastro, edição, pesquisa e cartões de clientes para mostrar os dois dados.
- Exibir CNPJ e inscrição estadual também no contexto administrativo dos pedidos B2B.

## Detalhes técnicos
- O CNPJ será armazenado sem pontuação para evitar duplicidades e formatado apenas na exibição.
- Novos cadastros exigirão os campos; registros antigos continuarão identificáveis para serem completados na próxima edição.
- As regras serão aplicadas no navegador e no banco, mantendo a separação do B2B em relação à loja comum.

## Validação
- Verificar cadastro e edição com CNPJ válido, rejeição de CNPJ inválido e aceite de “Isento”.
- Confirmar as telas do representante e da administração em computador e celular.
