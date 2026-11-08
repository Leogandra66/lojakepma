// Curadoria local de acessórios nas galerias institucionais (isolada da loja).
// Os modelos das séries B1 e A1 não acompanham bag: acompanham case TKL rígido.
import tklCase from "@/assets/tkl-case-real.jpg.asset.json";

import a1Ga from "@/assets/a1-grand-auditorium-hd.png.asset.json";
import a1Om from "@/assets/a1-orchestra.jpg.asset.json";
import b1D from "@/assets/b1-dreadnought-hd.png.asset.json";
import g1sDN from "@/assets/g1s-dreadnought-n.webp.asset.json";
import g1sGaCores from "@/assets/g1s-ga-cores.webp.asset.json";
import g1sDWa from "@/assets/g1s-dreadnought-wa.png.asset.json";
import g1sDNat from "@/assets/g1s-dreadnought-natural.png.asset.json";
import f1D from "@/assets/f1-dreadnought-oficial.webp.asset.json";
import f1Ga from "@/assets/f1-grand-auditorium-oficial.jpg.asset.json";
import f1OmBs from "@/assets/f1-orchestra-sunburst.jpg.asset.json";
import f1OmN from "@/assets/f1-orchestra-natural.jpg.asset.json";

export const TKL_CASE_URL = tklCase.url;

// Fotos curadas extras por série (exibidas no início da galeria)
export const EXTRA_SERIES_IMAGES: Record<string, string[]> = {
  A1: [a1Ga.url, a1Om.url],
  B1: [b1D.url],
  G1S: [g1sGaCores.url, g1sDWa.url, g1sDN.url, g1sDNat.url],
  F1: [f1D.url, f1Ga.url, f1OmBs.url, f1OmN.url],
};

// Shapes de corpo disponíveis por série (exibidos na ficha técnica)
export const SERIES_BODY_SHAPES: Record<string, string> = {
  A1: "Dreadnought, Grand Auditorium e Orchestra",
  B1: "Dreadnought, Grand Auditorium e Orchestra",
  F1: "Dreadnought, Grand Auditorium e Orchestra",
  G1S: "Grand Auditorium e Dreadnought, nas cores N, BS e WA",
};

export const CURATED_URLS = new Set([TKL_CASE_URL, ...Object.values(EXTRA_SERIES_IMAGES).flat()]);

// Séries cuja galeria institucional deve exibir o case TKL (não acompanham bag)
export const CASE_SERIES = new Set(["B1", "A1"]);

// Fotos de bag retiradas da galeria institucional (identificadas pelo nome do arquivo)
export const EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/2f5a1311-a2ca-4cba-8fc8-cb2e0bacefab/1776995312583-0-qa6y95.webp",
]);

// Seleção F1: retirar as fotos originais 1, 4, 6, 7, 8, 10, 11, 12 e 13.
// URLs fixas preservam a seleção mesmo quando a ordem do catálogo mudar.
export const F1_EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b1706821-4263-4795-be34-c88999bc221d/1792030680270-0-1r4gn9.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/cd50465c-03ee-46a5-bae0-679915ed0292/1776343647935-0.png",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b1706821-4263-4795-be34-c88999bc221d/1792029918489-2-cehyax.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/cd50465c-03ee-46a5-bae0-679915ed0292/1776343668929-1.png",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b1706821-4263-4795-be34-c88999bc221d/1792029920375-3-mpmnks.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/e1fbbed9-5004-451c-8424-dbc86d2efb36/1777237884116-0-ezwwwm.jpg",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/af18abaa-56fe-45df-8acf-a157d6989493/1777237593730-0-q5h1kv.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b1706821-4263-4795-be34-c88999bc221d/1792030764784-0-lybi7d.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/dc1b5cf2-8c27-4f0a-a2de-38d46d51c5bf/1776995589524-0-08t6jj.webp",
]);

// Seleção F0B Fênix: retirar as fotos 3, 4, 7, 8, 9 e 10 da galeria exibida.
export const F0B_FENIX_EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/6f68123c-75b5-416e-902e-a0bacea315d7/1776689573367-0.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/103c8fb1-f1d4-427e-b1be-fcd56fa32bfa/1778615694398-0-dq5yr1.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/103c8fb1-f1d4-427e-b1be-fcd56fa32bfa/1778615571932-0-gt7bs3.jpg",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/0529e3a9-4c63-4526-b7df-2b9cf07d03e5/1777463326000-0-pvbgny.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/0529e3a9-4c63-4526-b7df-2b9cf07d03e5/1777463362174-0-u2ejh1.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/6f68123c-75b5-416e-902e-a0bacea315d7/1777463425712-0-9rmtee.webp",
]);

// Seleção EC Plus: retirar as fotos 2, 4, 6, 8 e 11 da galeria exibida.
export const EC_PLUS_EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/a6b19162-a230-4409-9882-9ddc0c0f9cd6/1776218246584-0.png",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/9490a176-c6db-41e9-a2f2-aeec095a9e53/1780942772681-0-uj60pq.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/ef1cd4aa-3b8a-4e9e-b890-d670d0e620e2/1779398964888-0-rwld8l.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/a6b19162-a230-4409-9882-9ddc0c0f9cd6/1776218297186-0.png",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/106f549e-9a16-4456-86c1-c3c38017f27a/1780320450402-0-lj0sy8.jpg",
]);

// Seleção FC Mini: retirar as fotos 2, 5, 8, 9, 10 e 12 da galeria exibida.
export const FC_MINI_EXCLUDED_GALLERY_URLS = new Set([
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b899c7ab-013d-4837-a844-fd2e8460dbe7/1776563421619-1.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b899c7ab-013d-4837-a844-fd2e8460dbe7/1776563601558-0.jpg",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/b6c141d8-4285-4cf2-9546-15ee3001616f/1780943228313-0-9bacng.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/771f1652-7162-4dae-a78b-09de446309f6/1776737263220-0-1c2wsm.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/59016e11-4a38-49d6-948a-251442428c8e/1776995937189-0-sz7wja.webp",
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/59016e11-4a38-49d6-948a-251442428c8e/1776996020169-0-ucvwiu.jpg",
]);

// Exclusões por série: a curadoria de uma linha nunca afeta as demais.
export const SERIES_EXCLUDED_GALLERY_URLS: Record<string, Set<string>> = {
  F1: F1_EXCLUDED_GALLERY_URLS,
  "F0B Fênix": F0B_FENIX_EXCLUDED_GALLERY_URLS,
  "EC Plus": EC_PLUS_EXCLUDED_GALLERY_URLS,
  "FC Mini": FC_MINI_EXCLUDED_GALLERY_URLS,
};

export function applyGalleryCuration(seriesName: string, images: string[]): string[] {
  const seriesExcluded = SERIES_EXCLUDED_GALLERY_URLS[seriesName];
  const filtered = images.filter(
    (u) => !EXCLUDED_GALLERY_URLS.has(u) && !(seriesExcluded?.has(u) ?? false),
  );
  const withExtras = [...(EXTRA_SERIES_IMAGES[seriesName] ?? []), ...filtered];
  return CASE_SERIES.has(seriesName) ? [...withExtras, TKL_CASE_URL] : withExtras;
}
