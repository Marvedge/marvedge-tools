/**
 * Marvedge Micro-SaaS — Shared Video Core Engine
 *
 * Reusable video infrastructure providing file probing, memory budgeting,
 * Web Worker frame quantization, GIF encoding, and seek synchronization.
 */

// 1. Export all domain contracts & message types
export type {
  VideoMetadata,
  ProbeOptions,
  EncodingOptions,
  MemoryBudgetOptions,
  MemoryBudgetEstimate,
  WorkerInMessage,
  WorkerOutMessage,
  VideoProcessResult,
  ProgressCallback,
} from "./types";

// 2. Export Video Probing capabilities
export { probeVideo, DEFAULT_PROBE_TIMEOUT_MS } from "./probe";

// 3. Export Memory Guard & Budgeting utilities
export {
  estimateMemoryBudget,
  DEFAULT_THRESHOLD_MB,
  ORIGINAL_SPEC_THRESHOLD_MB,
  MOBILE_SAFE_THRESHOLD_MB,
  MIN_DIMENSION,
  MAX_DIMENSION,
  MAX_FPS,
  MAX_DURATION_SECONDS,
} from "./memory-guard";

// 4. Export Video-to-GIF Controller & Worker orchestration
export {
  encodeVideoToGif,
  seekVideo,
  createVideoWorker,
  SEEK_TIMEOUT_MS,
  type EncodeGifParams,
} from "./controller";
