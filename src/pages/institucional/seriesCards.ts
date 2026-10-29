// Curated existing product photos, used exclusively by the institutional home.
export const SERIES_CARDS = [
  {"name": "B1", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/7ef791b1-4dd2-47b5-a291-09bcc1c27962/1777400723521-0-2rznmj.webp"},
  {"name": "A1", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/8e73c939-5b3a-4b15-aff5-eee7f3c18641/1782309363308-0-3dpcvh.webp"},
  {"name": "G1S", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/5d9e43ec-e34d-44e4-a533-8dda40f62595/1777924725973-1-xmb5pl.webp"},
  {"name": "F1", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/dc1b5cf2-8c27-4f0a-a2de-38d46d51c5bf/1776656980985-0.webp"},
  {"name": "F0 Pro", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/41321faa-10e3-4cf6-9df7-4a130eed8411/1779383638291-0-qlh5kf.webp"},
  {"name": "F0B Fênix", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/0529e3a9-4c63-4526-b7df-2b9cf07d03e5/1777463302074-0-tt1x1j.webp"},
  {"name": "EC Plus", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/f10e3015-e9b9-4daa-928d-8a26fd5b84d4/1780942996247-0-lk252y.webp"},
  {"name": "FC Mini", "cover": "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/9def664b-bb47-484d-8412-c15221ad12dc/1780942527318-1-4akor1.webp"},
] as const;

export function orderInstitutionalSeries<T extends { name: string }>(series: T[]): T[] {
  const rank = new Map<string, number>(SERIES_CARDS.map((s, i) => [s.name, i]));
  return [...series].sort((a, b) => (rank.get(a.name) ?? 99) - (rank.get(b.name) ?? 99));
}
