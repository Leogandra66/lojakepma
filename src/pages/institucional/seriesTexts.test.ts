import { describe, expect, it } from "vitest";
import { applyNeckJointNote, NECK_JOINT_NOTE, SERIES_DESCRIPTIONS, SERIES_TEXTS, SERIES_VIDEOS } from "./seriesTexts";

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

  it("states the F1 specifications given by the brand", () => {
    const f1 = SERIES_DESCRIPTIONS.F1;
    expect(f1).toBeDefined();
    const lines = f1.split("\n");
    expect(lines).toHaveLength(15);
    expect(lines).toContain("Tampo: Abeto Sitka maciço de grau AA (quarter sawn selecionado)");
    expect(lines).toContain("Espessura do tampo: 3,2 mm ± 0,2 mm");
    expect(lines).toContain("Fundo & lados: Mogno africano laminado");
    expect(lines).toContain("Sistema de travessas: Padrão X recortado");
    expect(lines).toContain("Braço: Mogno africano / formato C");
    expect(lines).toContain("Usinagem do braço: Todo usinado por máquina CNC");
    expect(lines).toContain("Escala & ponte: Rosewood");
    expect(lines).toContain("Tecnologia: Plek");
    expect(lines).toContain("Pestana & rastilho: Osso");
    expect(lines).toContain("Comprimento de escala: 647,25 mm");
    expect(lines).toContain("Largura da porca: 43 mm");
    expect(lines).toContain("Largura no 14º traste: 54 mm");
    expect(lines).toContain("Número de trastes: 20");
    expect(lines).toContain("Material do traste: Albata (1,0 × 2,0 mm)");
    expect(lines).toContain("Tarraxas: Fundidas sob pressão KEPMA de alta qualidade");
    expect(f1).not.toContain("Tarrachas");
    // O encaixe do braço entra automaticamente na linha "Braço", não como parágrafo solto.
    expect(f1.split("\n")).not.toContain(NECK_JOINT_NOTE);
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

describe("institutional series videos", () => {
  it("plays the B1 video from the beginning below the spec sheet", () => {
    expect(SERIES_VIDEOS["B1"]).toEqual([
      { id: "w9hKxSY0qgI", start: 0, title: "Vídeo da série B1 Kepma" },
    ]);
  });

  it("keeps both F1 videos, each starting from zero", () => {
    expect(SERIES_VIDEOS["F1"].map((v) => v.id)).toEqual(["wUuv9AU51TM", "cKANBJe84yc"]);
    expect(SERIES_VIDEOS["F1"].every((v) => v.start === 0)).toBe(true);
  });

  it("plays the A1 video from the beginning below the spec sheet", () => {
    expect(SERIES_VIDEOS["A1"]).toEqual([
      { id: "1vMM4QSHg3U", start: 0, title: "Vídeo da série A1 Kepma" },
    ]);
  });

  it("plays the F0 Pro, F0B Fênix and FC Mini videos from the beginning", () => {
    expect(SERIES_VIDEOS["F0 Pro"]).toEqual([
      { id: "dDyvXkfzABY", start: 0, title: "Vídeo da série F0 Pro Kepma" },
    ]);
    expect(SERIES_VIDEOS["F0B Fênix"]).toEqual([
      { id: "Hb7jglTAyXA", start: 0, title: "Vídeo da série F0B Fênix Kepma" },
    ]);
    expect(SERIES_VIDEOS["FC Mini"]).toEqual([
      { id: "CMysHFQhVdw", start: 0, title: "Vídeo da série FC Mini Kepma" },
    ]);
  });

  it("only lists curated series with usable youtube ids", () => {
    expect(Object.keys(SERIES_VIDEOS).sort()).toEqual(["A1", "B1", "F0 Pro", "F0B Fênix", "F1", "FC Mini"]);
    for (const list of Object.values(SERIES_VIDEOS)) {
      expect(list.length).toBeGreaterThan(0);
      for (const v of list) {
        expect(v.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
        expect(v.start).toBeGreaterThanOrEqual(0);
        expect(v.title.length).toBeGreaterThan(0);
      }
    }
  });
});
