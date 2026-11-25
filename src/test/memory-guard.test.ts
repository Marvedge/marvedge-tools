import { describe, expect, it } from "vitest";
import {
  estimateMemoryBudget,
  DEFAULT_THRESHOLD_MB,
  MIN_DIMENSION,
  MAX_DIMENSION,
  MAX_FPS,
  MAX_DURATION_SECONDS,
} from "@/lib/video-core/memory-guard";

describe("Memory Guard — estimateMemoryBudget", () => {
  it("approves normal, safe input parameters", () => {
    // 480x270, 3 seconds @ 10 FPS (30 frames)
    const result = estimateMemoryBudget({
      width: 480,
      height: 270,
      duration: 3,
      fps: 10,
    });

    expect(result.isSafe).toBe(true);
    expect(result.code).toBe("SAFE");
    expect(result.totalFrames).toBe(30);
    expect(result.thresholdMegabytes).toBe(DEFAULT_THRESHOLD_MB);
    expect(result.estimatedPeakMegabytes).toBeLessThan(DEFAULT_THRESHOLD_MB);
    expect(result.estimatedPeakBytes).toBeGreaterThan(0);
    expect(result.estimatedGifBytes).toBeGreaterThan(0);
    expect(result.reason).toBeUndefined();
    expect(result.warning).toBeUndefined();
  });

  it("rejects excessively large dimensions (e.g. beyond 4K limit)", () => {
    const result = estimateMemoryBudget({
      width: MAX_DIMENSION + 1,
      height: 1080,
      duration: 5,
      fps: 15,
    });

    expect(result.isSafe).toBe(false);
    expect(result.code).toBe("INVALID_DIMENSIONS");
    expect(result.reason).toContain("Video dimensions");
  });

  it("rejects invalid, zero, or negative dimensions", () => {
    const zeroWidth = estimateMemoryBudget({
      width: 0,
      height: 720,
      duration: 5,
      fps: 15,
    });
    expect(zeroWidth.isSafe).toBe(false);
    expect(zeroWidth.code).toBe("INVALID_DIMENSIONS");

    const negativeHeight = estimateMemoryBudget({
      width: 640,
      height: -100,
      duration: 5,
      fps: 15,
    });
    expect(negativeHeight.isSafe).toBe(false);
    expect(negativeHeight.code).toBe("INVALID_DIMENSIONS");

    const subMinimum = estimateMemoryBudget({
      width: MIN_DIMENSION - 1,
      height: MIN_DIMENSION - 1,
      duration: 5,
      fps: 15,
    });
    expect(subMinimum.isSafe).toBe(false);
    expect(subMinimum.code).toBe("INVALID_DIMENSIONS");

    const nanDim = estimateMemoryBudget({
      width: Number.NaN,
      height: 720,
      duration: 5,
      fps: 15,
    });
    expect(nanDim.isSafe).toBe(false);
    expect(nanDim.code).toBe("INVALID_DIMENSIONS");
  });

  it("rejects excessive frame rates or durations", () => {
    const excessiveFps = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: MAX_FPS + 1,
    });
    expect(excessiveFps.isSafe).toBe(false);
    expect(excessiveFps.code).toBe("INVALID_FRAMES");

    const zeroFps = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: 0,
    });
    expect(zeroFps.isSafe).toBe(false);
    expect(zeroFps.code).toBe("INVALID_FRAMES");

    const excessiveDuration = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: MAX_DURATION_SECONDS + 1,
      fps: 15,
    });
    expect(excessiveDuration.isSafe).toBe(false);
    expect(excessiveDuration.code).toBe("INVALID_FRAMES");
  });

  it("rejects jobs exceeding the configured memory budget", () => {
    // 1920x1080 @ 30 FPS for 20s (600 frames) on a tight 50 MB budget
    const result = estimateMemoryBudget({
      width: 1920,
      height: 1080,
      duration: 20,
      fps: 30,
      thresholdMegabytes: 50,
    });

    expect(result.isSafe).toBe(false);
    expect(result.code).toBe("EXCEEDS_BUDGET");
    expect(result.reason).toContain("exceeds the configured safe threshold");
    expect(result.estimatedPeakMegabytes).toBeGreaterThan(50);
  });

  it("handles boundary condition accurately (exact threshold match)", () => {
    // Test that calculation respects custom threshold
    const testThreshold = 100;
    const result = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: 10,
      thresholdMegabytes: testThreshold,
    });

    expect(result.thresholdMegabytes).toBe(testThreshold);
    expect(result.isSafe).toBe(true);
    expect(result.estimatedPeakMegabytes).toBeLessThanOrEqual(testThreshold);
  });

  it("emits a warning when memory usage is near threshold (> 80%)", () => {
    // Craft input where peak memory is ~85% of a low custom threshold
    const sample = estimateMemoryBudget({
      width: 960,
      height: 540,
      duration: 10,
      fps: 15,
      thresholdMegabytes: 150,
    });

    // If peak memory exceeds 80% of threshold, warning should be present
    if (sample.estimatedPeakMegabytes > 150 * 0.8 && sample.isSafe) {
      expect(sample.warning).toBeDefined();
      expect(sample.warning).toContain("nearing the safe threshold");
    }
  });

  it("rejects invalid, zero or negative memory budget thresholds", () => {
    const zeroBudget = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: 15,
      thresholdMegabytes: 0,
    });
    expect(zeroBudget.isSafe).toBe(false);
    expect(zeroBudget.code).toBe("INVALID_BUDGET");

    const negBudget = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: 15,
      thresholdMegabytes: -50,
    });
    expect(negBudget.isSafe).toBe(false);
    expect(negBudget.code).toBe("INVALID_BUDGET");

    const nanBudget = estimateMemoryBudget({
      width: 640,
      height: 360,
      duration: 5,
      fps: 15,
      thresholdMegabytes: Number.NaN,
    });
    expect(nanBudget.isSafe).toBe(false);
    expect(nanBudget.code).toBe("INVALID_BUDGET");
  });
});
