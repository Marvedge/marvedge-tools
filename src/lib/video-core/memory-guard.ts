/**
 * Marvedge Micro-SaaS — Shared Video Core Memory Guard
 *
 * Evaluates memory consumption for video extraction and GIF encoding before
 * processing begins, guarding against browser tab crashes and OOM (Out-of-Memory)
 * terminations on constrained devices.
 */

import type { MemoryBudgetOptions, MemoryBudgetEstimate } from "./types";

/**
 * Original task T-00012 specification designated a 250 MB memory ceiling.
 * In our streaming Web Worker architecture, frames are extracted and transferred
 * sequentially, keeping the active main-thread footprint minimal.
 *
 * For mobile Safari and constrained devices, an aggressive 150 MB ceiling is available
 * via `thresholdMegabytes: MOBILE_SAFE_THRESHOLD_MB`.
 * By default, we honor the original 250 MB specification (`DEFAULT_THRESHOLD_MB = 250`).
 */
export const ORIGINAL_SPEC_THRESHOLD_MB = 250;
export const MOBILE_SAFE_THRESHOLD_MB = 150;
export const DEFAULT_THRESHOLD_MB = 250;

/** Minimum supported dimension for export in pixels */
export const MIN_DIMENSION = 16;

/** Maximum supported dimension (4K UHD) in pixels to protect canvas context allocation */
export const MAX_DIMENSION = 3840;

/** Maximum allowable frame rate for browser client processing */
export const MAX_FPS = 60;

/** Maximum allowable duration in seconds for in-browser client GIF generation */
export const MAX_DURATION_SECONDS = 60;

/**
 * Estimated ratio of compressed GIF size to raw 32-bit RGBA pixel stream.
 * Typical 256-color LZW-compressed GIFs occupy ~15% to 25% of uncompressed RGBA.
 */
export const ESTIMATED_GIF_COMPRESSION_RATIO = 0.2;

/**
 * Multiplier for transient buffer allocations during streaming execution:
 * - Canvas 2D ImageData buffer (4 bytes/px)
 * - Transferred ArrayBuffer in Worker (4 bytes/px)
 * - Worker quantization lookup & index table (~2 bytes/px)
 * - Browser video frame decode caching (~6 bytes/px)
 */
export const TRANSIENT_FRAME_BUFFER_MULTIPLIER = 4;

/**
 * Pure evaluation function that calculates memory requirements and determines
 * if the requested encoding parameters can execute safely within the memory budget.
 *
 * @param options - Video dimensions, duration, FPS, and optional memory ceiling.
 * @returns MemoryBudgetEstimate with safety decision, byte calculations, and clear reasons.
 */
export function estimateMemoryBudget(options: MemoryBudgetOptions): MemoryBudgetEstimate {
  const threshold = options.thresholdMegabytes ?? DEFAULT_THRESHOLD_MB;

  // 1. Validate custom threshold
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return {
      estimatedPeakBytes: 0,
      estimatedPeakMegabytes: 0,
      estimatedRawBytes: 0,
      estimatedMegabytes: 0,
      estimatedGifBytes: 0,
      totalFrames: 0,
      thresholdMegabytes: threshold,
      isSafe: false,
      code: "INVALID_BUDGET",
      reason: `Configured memory threshold must be a positive finite number (received: ${threshold}).`,
    };
  }

  const { width, height, fps, duration } = options;

  // 2. Validate Dimensions
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < MIN_DIMENSION ||
    height < MIN_DIMENSION ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {
    return {
      estimatedPeakBytes: 0,
      estimatedPeakMegabytes: 0,
      estimatedRawBytes: 0,
      estimatedMegabytes: 0,
      estimatedGifBytes: 0,
      totalFrames: 0,
      thresholdMegabytes: threshold,
      isSafe: false,
      code: "INVALID_DIMENSIONS",
      reason: `Video dimensions (${width}x${height}) must be finite numbers between ${MIN_DIMENSION}px and ${MAX_DIMENSION}px.`,
    };
  }

  // 3. Validate Frame Rate and Duration
  if (!Number.isFinite(fps) || fps <= 0 || fps > MAX_FPS) {
    return {
      estimatedPeakBytes: 0,
      estimatedPeakMegabytes: 0,
      estimatedRawBytes: 0,
      estimatedMegabytes: 0,
      estimatedGifBytes: 0,
      totalFrames: 0,
      thresholdMegabytes: threshold,
      isSafe: false,
      code: "INVALID_FRAMES",
      reason: `Frame rate (${fps}) must be a positive number up to ${MAX_FPS} FPS.`,
    };
  }

  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_SECONDS) {
    return {
      estimatedPeakBytes: 0,
      estimatedPeakMegabytes: 0,
      estimatedRawBytes: 0,
      estimatedMegabytes: 0,
      estimatedGifBytes: 0,
      totalFrames: 0,
      thresholdMegabytes: threshold,
      isSafe: false,
      code: "INVALID_FRAMES",
      reason: `Duration (${duration}s) must be a positive number up to ${MAX_DURATION_SECONDS} seconds.`,
    };
  }

  // 4. Calculate Frame Count and Byte Projections
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const singleFrameBytes = Math.round(width) * Math.round(height) * 4;
  const estimatedRawBytes = singleFrameBytes * totalFrames;
  const estimatedRawMb = Number((estimatedRawBytes / (1024 * 1024)).toFixed(2));

  // Estimated final compressed GIF accumulation buffer
  const estimatedGifBytes = Math.round(estimatedRawBytes * ESTIMATED_GIF_COMPRESSION_RATIO);

  // Peak streaming memory: instantaneous transient frame buffers + accumulated GIF bytes
  const peakTransientBytes = singleFrameBytes * TRANSIENT_FRAME_BUFFER_MULTIPLIER;
  const estimatedPeakBytes = peakTransientBytes + estimatedGifBytes;
  const estimatedPeakMb = Number((estimatedPeakBytes / (1024 * 1024)).toFixed(2));

  // 5. Safety Determination
  const isSafe = estimatedPeakMb <= threshold;

  if (!isSafe) {
    return {
      estimatedPeakBytes,
      estimatedPeakMegabytes: estimatedPeakMb,
      estimatedRawBytes,
      estimatedMegabytes: estimatedRawMb,
      estimatedGifBytes,
      totalFrames,
      thresholdMegabytes: threshold,
      isSafe: false,
      code: "EXCEEDS_BUDGET",
      reason: `Estimated peak memory (${estimatedPeakMb} MB) exceeds the configured safe threshold of ${threshold} MB. Lower output resolution or duration to prevent browser tab termination.`,
    };
  }

  const warning =
    estimatedPeakMb > threshold * 0.8
      ? `Estimated peak memory (${estimatedPeakMb} MB) is nearing the safe threshold of ${threshold} MB. Processing may slow down on mobile devices.`
      : undefined;

  const result: MemoryBudgetEstimate = {
    estimatedPeakBytes,
    estimatedPeakMegabytes: estimatedPeakMb,
    estimatedRawBytes,
    estimatedMegabytes: estimatedRawMb,
    estimatedGifBytes,
    totalFrames,
    thresholdMegabytes: threshold,
    isSafe: true,
    code: "SAFE",
  };

  if (warning !== undefined) {
    result.warning = warning;
  }

  return result;
}
