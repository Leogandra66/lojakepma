// Curadoria local de acessórios nas galerias institucionais (isolada da loja).
// Os modelos das séries B1 e A1 não acompanham bag: acompanham case TKL rígido.
import tklCase from "@/assets/tkl-case-real.jpg.asset.json";

import a1Ga from "@/assets/a1-grand-auditorium-hd.png.asset.json";
import a1Om from "@/assets/a1-orchestra.jpg.asset.json";
import b1D from "@/assets/b1-dreadnought-hd.png.asset.json";

export const TKL_CASE_URL = tklCase.url;

// Fotos curadas extras por série (exibidas no início da galeria)
export const EXTRA_SERIES_IMAGES: Record<string, string[]> = {
  A1: [a1Ga.url, a1Om.url],
  B1: [b1D.url],
};

// Shapes de corpo disponíveis por série (exibidos na ficha técnica)
export const SERIES_BODY_SHAPES: Record<string, string> = {
  A1: "Dreadnought, Grand Auditorium e Orchestra",
  B1: "Dreadnought, Grand Auditorium e Orchestra",
  F1: "Dreadnought, Grand Auditorium e Orchestra",
};

export const CURATED_URLS = new Set([TKL_CASE_URL, ...Object.values(EXTRA_SERIES_IMAGES).flat()]);

// Séries cuja galeria institucional deve exibir o case TKL (não acompanham bag)
export const CASE_SERIES = new Set(["B1", "A1"]);

// Fotos de bag retiradas da galeria institucional (identificadas pelo nome do arquivo)
export const EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/2f5a1311-a2ca-4cba-8fc8-cb2e0bacefab/1776995312583-0-qa6y95.webp",
]);

export function applyGalleryCuration(seriesName: string, images: string[]): string[] {
  const filtered = images.filter((u) => !EXCLUDED_GALLERY_URLS.has(u));
  const withExtras = [...(EXTRA_SERIES_IMAGES[seriesName] ?? []), ...filtered];
  return CASE_SERIES.has(seriesName) ? [...withExtras, TKL_CASE_URL] : withExtras;
}
