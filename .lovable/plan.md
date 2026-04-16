

## Plan: Otimizar imagens no upload com compressão client-side

### Problema
As imagens são enviadas no tamanho original (podem ter 5-10MB+), o que atrasa o carregamento do site. Não há nenhuma compressão ou redimensionamento antes do upload.

### Solução
Adicionar uma função de compressão no frontend usando Canvas API antes do upload. A imagem será redimensionada para no máximo 1600x1600px e convertida para WebP com qualidade 85% — mantendo excelente qualidade visual para tela enquanto reduz drasticamente o tamanho do arquivo (tipicamente 80-90% menor).

### O que será feito

1. **Criar utilitário de compressão** (`src/lib/imageUtils.ts`)
   - Função `compressImage(file: File)` que usa Canvas API nativo do browser
   - Redimensiona para max 1600x1600px mantendo proporção
   - Converte para WebP com qualidade 85%
   - Retorna um novo File pronto para upload

2. **Atualizar o upload no AdminImageManager**
   - Importar e aplicar `compressImage()` antes de cada `supabase.storage.upload()`
   - Alterar a extensão do arquivo salvo para `.webp`
   - Manter o fluxo existente intacto

### Detalhes técnicos
- Usa `HTMLCanvasElement` e `toBlob('image/webp', 0.85)` — sem dependências externas
- 1600px é suficiente para telas retina em cards e zoom
- WebP oferece ~30-50% menor que JPEG na mesma qualidade
- Imagens existentes não são afetadas, apenas novos uploads

