// Curadoria local de acessórios nas galerias institucionais (isolada da loja).
// Os modelos das séries B1 e A1 não acompanham bag: acompanham case TKL rígido.
import tklCase from "@/assets/tkl-case-real.jpg.asset.json";

export const TKL_CASE_URL = tklCase.url;

// Séries cuja galeria institucional deve exibir o case TKL (não acompanham bag)
export const CASE_SERIES = new Set(["B1", "A1"]);

// Fotos de bag retiradas da galeria institucional (identificadas pelo nome do arquivo)
export const EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/2f5a1311-a2ca-4cba-8fc8-cb2e0bacefab/1776995312583-0-qa6y95.webp",
]);

export function applyGalleryCuration(seriesName: string, images: string[]): string[] {
  const filtered = images.filter((u) => !EXCLUDED_GALLERY_URLS.has(u));
  return CASE_SERIES.has(seriesName) ? [...filtered, TKL_CASE_URL] : filtered;
}
