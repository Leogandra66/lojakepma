import { describe, expect, it } from "vitest";
import { applyGalleryCuration, CASE_SERIES, EXCLUDED_GALLERY_URLS, TKL_CASE_URL } from "./seriesAccessories";

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
    expect(out).toEqual(["https://exemplo.com/a1-1.webp", "https://exemplo.com/a1-2.webp", TKL_CASE_URL]);
  });

  it("never adds the case to other series, and filters the excluded bag photo globally", () => {
    const out = applyGalleryCuration("G1S", ["https://exemplo.com/g1s.webp", BAG_URL]);
    expect(out).toEqual(["https://exemplo.com/g1s.webp"]);
    expect(CASE_SERIES.has("G1S")).toBe(false);
  });

  it("curation only excludes the known bag photo", () => {
    expect([...EXCLUDED_GALLERY_URLS]).toEqual([BAG_URL]);
  });
});
