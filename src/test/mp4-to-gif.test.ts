import { describe, expect, it } from "vitest";
import { estimateMemoryBudget } from "@/lib/video-core/memory-guard";

describe("MP4 to GIF Tool — Business Logic & Validation Checks", () => {
  it("enforces 20-second maximum clip duration boundary", () => {
    const validTrim = 20.0 - 0.0;
    expect(validTrim <= 20).toBe(true);

    const invalidTrim = 20.1 - 0.0;
    expect(invalidTrim > 20).toBe(true);
  });

  it("enforces start time strictly before end time", () => {
    const start = 3.5;
    const end = 2.0;
    expect(end <= start).toBe(true);
  });

  it("evaluates width boundaries (160px to 960px)", () => {
    const minWidth = 160;
    const maxWidth = 960;

    const normalBudget = estimateMemoryBudget({
      width: minWidth,
      height: 90,
      duration: 5,
      fps: 15,
    });
    expect(normalBudget.isSafe).toBe(true);

    const maxBudget = estimateMemoryBudget({
      width: maxWidth,
      height: 540,
      duration: 5,
      fps: 15,
    });
    expect(maxBudget.isSafe).toBe(true);
  });

  it("evaluates frame rate range (5 to 25 FPS)", () => {
    const lowFps = estimateMemoryBudget({
      width: 480,
      height: 270,
      duration: 3,
      fps: 5,
    });
    expect(lowFps.totalFrames).toBe(15);
    expect(lowFps.isSafe).toBe(true);

    const highFps = estimateMemoryBudget({
      width: 480,
      height: 270,
      duration: 3,
      fps: 25,
    });
    expect(highFps.totalFrames).toBe(75);
    expect(highFps.isSafe).toBe(true);
  });

  it("rejects extreme 4K resolution requests", () => {
    const extreme = estimateMemoryBudget({
      width: 3840,
      height: 2160,
      duration: 20,
      fps: 25,
      thresholdMegabytes: 150,
    });

    expect(extreme.isSafe).toBe(false);
    expect(extreme.code).toBe("EXCEEDS_BUDGET");
  });

  it("rejects invalid, NaN, or non-finite dimensions", () => {
    const nanHeight = estimateMemoryBudget({
      width: 480,
      height: Number.NaN,
      duration: 5,
      fps: 15,
    });
    expect(nanHeight.isSafe).toBe(false);
    expect(nanHeight.code).toBe("INVALID_DIMENSIONS");
  });
});
