import { describe, expect, it } from "vitest";
import { orderInstitutionalSeries } from "./seriesCards";

describe("institutional series ordering", () => {
  it("orders the lines from most refined to simplest without changing the source", () => {
    const input = ["FC Mini", "F0B Fênix", "F1", "EC Plus", "G1S", "A1", "F0 Pro", "B1"].map(name => ({ name }));
    expect(orderInstitutionalSeries(input).map(s => s.name)).toEqual([
      "B1", "A1", "G1S", "F1", "F0 Pro", "F0B Fênix", "EC Plus", "FC Mini",
    ]);
    expect(input[0].name).toBe("FC Mini");
  });
});