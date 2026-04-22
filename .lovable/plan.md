

## Corrigir erro de upload de imagens (limite de 6)

### Problema
Existe uma restrição no banco (`position_range`) que limita o número de imagens por produto a no máximo **6**. Por isso, ao tentar subir uma 7ª imagem no produto "Violão Kepma F1 OM BS Acústico" (que já tem 6), o sistema retorna o erro `violates check constraint "position_range"`.

Além disso, é o motivo de o sistema não conseguir adicionar/substituir imagens nesses produtos cheios.

### Solução

**1. Remover a restrição rígida do banco**
Migration SQL para remover a constraint `position_range` da tabela `product_images`. Sem ela, será possível ter quantas imagens forem necessárias por produto. A unicidade `(product_id, position)` continua garantindo que não haja posições duplicadas.

```sql
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS position_range;
```

**2. Manter a renormalização automática**
A lógica atual em `productImageManagerUtils.ts` (que já normaliza posições 1..N após cada operação) continuará funcionando e fica ainda mais robusta sem a barreira de 6.

**3. Opcional — Aviso visual no admin**
Adicionar uma pequena mensagem informativa no `AdminImageManager.tsx` recomendando até ~10 imagens por produto (apenas como boa prática de UX/performance, sem bloquear).

### Resultado esperado
- Possível subir, deletar, reordenar e substituir imagens livremente.
- Produtos podem ter qualquer quantidade de imagens.
- Sem mais erro `position_range`.
- A imagem principal continua sincronizada automaticamente com a posição 1.

### Arquivos afetados
- **Migration nova** (remoção da constraint `position_range`)
- `src/components/AdminImageManager.tsx` (apenas se aprovar o aviso visual opcional)

