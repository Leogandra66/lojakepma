## Atualização de URL da InfinitePay

A InfinitePay notificou que a URL da API de checkout será desativada em 01/06. Precisamos atualizar uma URL no edge function.

### Mudança necessária

**Arquivo:** `supabase/functions/create-payment/index.ts`

**Linha 55:** Substituir a URL antiga pela nova:
- **Antiga:** `https://api.infinitepay.io/invoices/public/checkout/links`
- **Nova:** `https://api.checkout.infinitepay.io/links`

### O que não muda
- O payload da requisição continua o mesmo
- Os webhooks continuam funcionando normalmente
- A segunda URL (`payment_check`) mencionada no aviso não é usada no projeto

### Validação
- Verificar se o edge function `create-payment` continua funcionando após a mudança