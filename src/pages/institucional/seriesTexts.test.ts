import { describe, expect, it } from "vitest";
import { SERIES_TEXTS } from "./seriesTexts";

describe("curated institutional series texts", () => {
  const fcMini = SERIES_TEXTS["FC Mini"];

  it("gives FC Mini the editorial text with its seven section headings", () => {
    expect(fcMini).toBeDefined();
    expect(fcMini.map((b) => b.heading).filter(Boolean)).toEqual([
      "Primeiro, o tampo sólido…",
      "Design exclusivo de braço aparafusado em 4 pontos redesenhado",
      "Haste de tensão mais curta",
      "Acabamento à base de água e espessura reduzida",
      "Topo mais fino",
      "Tecnologia Arch Back",
      "Sistema de leque do fundo removido",
    ]);
  });

  it("keeps the FC Mini technical figures stated by the brand", () => {
    const all = fcMini.map((b) => `${b.heading ?? ""} ${b.body}`).join(" ");
    expect(all).toContain("Ao pensar em violões compactos para viagem");
    expect(all.toLowerCase()).not.toContain("guitarra");
    expect(all).toContain("2,75 mm");
    expect(all).toContain("0,052 mm");
    expect(all).toContain("355 mm");
    expect(all).toContain("encaixe aparafusado NC");
    expect(all).toContain("fundo arqueado");
  });

  it("does not add editorial text to other series", () => {
    expect(SERIES_TEXTS["B1"]).toBeUndefined();
    expect(SERIES_TEXTS["G1S"]).toBeUndefined();
  });
});
