/**
 * Comprime e redimensiona uma imagem no client-side usando Canvas API.
 * - Mantém proporção original
 * - Redimensiona para no máximo `maxDimension` px no maior lado
 * - Converte para WebP com qualidade alta (preserva nitidez)
 * - Se a imagem original já for menor, mantém o tamanho original
 */
export async function compressImage(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    mimeType?: string;
  } = {}
): Promise<File> {
  const {
    maxDimension = 2000,
    quality = 0.92,
    mimeType = "image/webp",
  } = options;

  // Se não for imagem, retorna o arquivo original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // SVG não deve ser convertido
  if (file.type === "image/svg+xml") {
    return file;
  }

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  // Calcula novas dimensões mantendo proporção
  let { width, height } = img;
  const longest = Math.max(width, height);

  if (longest > maxDimension) {
    const scale = maxDimension / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Configurações para preservar qualidade na renderização
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );

  if (!blob) return file;

  // Se a versão comprimida ficou maior que a original (raro), usa a original
  if (blob.size >= file.size) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${baseName}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
