# Corrigir pedido de login indevido no checkout

## Problema
Ao finalizar a compra, o site pede login mesmo quando o usuário já está autenticado. Isso começou a acontecer por uma condição de corrida: a verificação de usuário acontece antes da sessão terminar de ser restaurada.

## Causa
`useAuth` expõe um estado `loading`, mas as telas de Carrinho e Checkout não o utilizam. Elas tratam "usuário ainda carregando" como "usuário deslogado" e redirecionam para o login cedo demais.

## Correção

**1. `src/pages/Checkout.tsx`**
- Ler também `loading` do `useAuth`.
- Enquanto `loading` for `true`, mostrar um estado de carregamento (spinner) em vez de redirecionar.
- Só executar `if (!user) navigate("/entrar?redirect=/checkout")` depois que `loading` for `false`.
- Mover o redirect para dentro de um `useEffect` (dependente de `loading` e `user`) para evitar navegar durante a renderização.

**2. `src/pages/Cart.tsx`**
- Ler também `loading` do `useAuth`.
- Enquanto `loading` for `true`, evitar mostrar o botão "Entrar para finalizar"; mostrar estado neutro/carregando, e só decidir entre "Ir para o checkout" vs "Entrar" após `loading` terminar.

## Detalhes técnicos
- Nenhuma mudança de backend, schema ou RLS é necessária — é puramente um ajuste de timing no frontend.
- O comportamento esperado: usuário logado vai direto ao checkout; usuário realmente deslogado continua sendo enviado ao login.

## Verificação
- Recarregar a página de checkout diretamente estando logado e confirmar que não há redirecionamento ao login.
- Adicionar produto ao carrinho, clicar em finalizar e confirmar que vai direto ao checkout.
- Testar deslogado para garantir que o redirect ao login ainda funciona.
