import { describe, expect, it } from "vitest";
import { applyNeckJointNote, NECK_JOINT_NOTE, SERIES_DESCRIPTIONS, SERIES_TEXTS } from "./seriesTexts";

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

describe("curated institutional series descriptions", () => {
  const f0b = SERIES_DESCRIPTIONS["F0B Fênix"];

  it("states the F0B Fênix specifications given by the brand", () => {
    expect(f0b).toBeDefined();
    const lines = f0b.split("\n");
    expect(lines).toContain("Corpo: Grand Auditorium");
    expect(lines).toContain("Fundo & lados: Laminado de mogno africano");
    expect(lines).toContain("Pestana & rastilho: Osso com compensador triplo");
    expect(lines).toContain("Comprimento de escala: 647.25mm");
    expect(lines).toContain("Eletrônica: KEPMA K10 Pro com efeitos e App - Kepma K11");
    expect(lines).toContain("Gig Bag: Kepma Gig bag");
  });

  it("keeps one spec per line so the ficha técnica stays complete", () => {
    const specs = f0b
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^([^:：]{1,40})[:：]\s*(.+)$/.test(l));
    expect(specs.length).toBe(22);
    expect(specs.every((l) => !/\s[:：]/.test(l.split(":")[0] ?? ""))).toBe(true);
    expect(f0b).not.toContain("fudo");
    expect(f0b).not.toContain("Phospor ");
    // O encaixe do braço agora é exibido dentro da especificação "Braço", não como parágrafo solto.
    expect(f0b.split("\n")).not.toContain(NECK_JOINT_NOTE);
  });

  it("states the F0 Pro specifications given by the brand", () => {
    const f0pro = SERIES_DESCRIPTIONS["F0 Pro"];
    expect(f0pro).toBeDefined();
    const lines = f0pro.split("\n");
    expect(lines).toContain("Corpo: Grand Auditorium");
    expect(lines).toContain("Acabamento: Smooth Satin - Fosco");
    expect(lines).toContain("Tecnologia: Plek");
    expect(lines).toContain("Comprimento de escala: 647.25mm");
    expect(lines).toContain("Cordas: D'Addario XS");
    expect(lines).toContain("Gig Bag: Kepma Deluxe Bag");
    expect(lines).toHaveLength(22);
    expect(f0pro).not.toContain("fudo");
    expect(f0pro).not.toContain(NECK_JOINT_NOTE);
  });

  it("does not override descriptions of other series", () => {
    expect(SERIES_DESCRIPTIONS["FC Mini"]).toBeUndefined();
    expect(SERIES_DESCRIPTIONS["EC Plus"]).toBeUndefined();
  });
});

describe("neck joint complement on every institutional series", () => {
  it("keeps the exact wording stated by the brand", () => {
    expect(NECK_JOINT_NOTE).toBe("Braço parafusado (Kepma developed NC neck joint)");
  });

  it("complements the Braço specification with the bolt-on neck joint", () => {
    const rows = applyNeckJointNote([
      { label: "Corpo", value: "Grand Auditorium" },
      { label: "Braço", value: "Mogno C/shape" },
    ]);
    expect(rows.find((r) => r.label === "Braço")?.value).toBe(
      "Mogno C/shape — Braço parafusado (Kepma developed NC neck joint)",
    );
    expect(rows).toHaveLength(2);
  });

  it("does not repeat the joint when the catalog already mentions it", () => {
    const rows = applyNeckJointNote([{ label: "Braço", value: "Nato C Shape  PARAFUSADO (NC Neck Joint)" }]);
    expect(rows[0].value).toBe("Nato C Shape — Braço parafusado (Kepma developed NC neck joint)");
    expect(rows[0].value.toLowerCase().match(/parafusad/g)).toHaveLength(1);
  });

  it("adds the Braço row when the catalog has none, after the body rows", () => {
    const rows = applyNeckJointNote([
      { label: "Corpo", value: "Dreadnought" },
      { label: "Fundo & lados", value: "Laminado de mogno africano" },
      { label: "Acabamento", value: "Fosco" },
    ]);
    expect(rows.map((r) => r.label)).toEqual(["Corpo", "Fundo & lados", "Braço", "Acabamento"]);
    expect(rows[2].value).toBe(NECK_JOINT_NOTE);
  });
});
