import { describe, expect, it } from "vitest";
import { VIDEOS } from "./InstitucionalDas";

describe("DAS page videos", () => {
  it("keeps the Bilibili video on desktop only", () => {
    const bilibili = VIDEOS.find((v) => v.src.includes("player.bilibili.com"));
    expect(bilibili).toBeDefined();
    expect(bilibili?.desktopOnly).toBe(true);
  });

  it("shows the YouTube video on every screen", () => {
    const youtube = VIDEOS.find((v) => v.src.includes("youtube-nocookie.com"));
    expect(youtube).toBeDefined();
    expect(youtube?.desktopOnly).toBe(false);
  });
});
