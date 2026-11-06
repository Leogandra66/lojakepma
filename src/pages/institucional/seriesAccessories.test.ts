import { describe, expect, it } from "vitest";
import { applyGalleryCuration, CASE_SERIES, EXCLUDED_GALLERY_URLS, EXTRA_SERIES_IMAGES, F0B_FENIX_EXCLUDED_GALLERY_URLS, F1_EXCLUDED_GALLERY_URLS, SERIES_BODY_SHAPES, TKL_CASE_URL } from "./seriesAccessories";

const BAG_URL =
  "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/2f5a1311-a2ca-4cba-8fc8-cb2e0bacefab/1776995312583-0-qa6y95.webp";

describe("institutional gallery curation (case TKL, sem bag)", () => {
  it("removes the bag photo from the B1 gallery and appends the TKL case", () => {
    const out = applyGalleryCuration("B1", ["https://exemplo.com/foto1.webp", BAG_URL, "https://exemplo.com/foto2.webp"]);
    expect(out).not.toContain(BAG_URL);
    expect(out[out.length - 1]).toBe(TKL_CASE_URL);
    expect(out).toContain("https://exemplo.com/foto1.webp");
  });

  it("appends the TKL case to the A1 gallery without removing other photos", () => {
    const out = applyGalleryCuration("A1", ["https://exemplo.com/a1-1.webp", "https://exemplo.com/a1-2.webp"]);
    expect(out).toEqual([...EXTRA_SERIES_IMAGES.A1, "https://exemplo.com/a1-1.webp", "https://exemplo.com/a1-2.webp", TKL_CASE_URL]);
  });

  it("never adds the case to other series, and filters the excluded bag photo globally", () => {
    const out = applyGalleryCuration("G1S", ["https://exemplo.com/g1s.webp", BAG_URL]);
    expect(out).toEqual([...EXTRA_SERIES_IMAGES.G1S, "https://exemplo.com/g1s.webp"]);
    expect(CASE_SERIES.has("G1S")).toBe(false);
  });

  it("curation only excludes the known bag photo", () => {
    expect([...EXCLUDED_GALLERY_URLS]).toEqual([BAG_URL]);
  });

  it("removes the nine selected F1 photos without excluding them from other series", () => {
    const removed = [...F1_EXCLUDED_GALLERY_URLS];
    const retained = [
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/cd50465c-03ee-46a5-bae0-679915ed0292/1776343635323-0.png",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/43a4536c-0c83-465d-b8ce-5eec9da326fd/1777237987648-0-byp0vq.webp",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/cd50465c-03ee-46a5-bae0-679915ed0292/1776343665645-0.png",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/cd50465c-03ee-46a5-bae0-679915ed0292/1776995572601-0-tm8p3l.webp",
    ];
    expect(removed).toHaveLength(9);
    expect(applyGalleryCuration("F1", [...removed, ...retained])).toEqual([...EXTRA_SERIES_IMAGES.F1, ...retained]);
    expect(applyGalleryCuration("F0 Pro", removed)).toEqual(removed);
  });

  it("removes the six selected F0B Fênix photos without excluding them from other series", () => {
    const removed = [...F0B_FENIX_EXCLUDED_GALLERY_URLS];
    const retained = [
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/0529e3a9-4c63-4526-b7df-2b9cf07d03e5/1777463255862-0-4y1fa7.webp",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/872d0f8f-18f6-49ef-adb6-9b8fb91ed0e7/1777463868707-0-y1u8pp.webp",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/872d0f8f-18f6-49ef-adb6-9b8fb91ed0e7/1777463631455-0-qcuprl.webp",
      "https://futrahzhqdvqwvuxlbqf.supabase.co/storage/v1/object/public/product-images/872d0f8f-18f6-49ef-adb6-9b8fb91ed0e7/1777463661785-1-x731u5.webp",
    ];
    expect(removed).toHaveLength(6);
    expect(applyGalleryCuration("F0B Fênix", [...removed, ...retained])).toEqual(retained);
    expect(applyGalleryCuration("F0 Pro", removed)).toEqual(removed);
  });

  it("A1, B1 and F1 list the three body shapes", () => {
    for (const k of ["A1", "B1", "F1"]) expect(SERIES_BODY_SHAPES[k]).toBe("Dreadnought, Grand Auditorium e Orchestra");
  });

  it("G1S lists Grand Auditorium and Dreadnought in colors N, BS and WA, with four curated photos", () => {
    expect(SERIES_BODY_SHAPES.G1S).toBe("Grand Auditorium e Dreadnought, nas cores N, BS e WA");
    expect(EXTRA_SERIES_IMAGES.G1S).toHaveLength(4);
  });
});
