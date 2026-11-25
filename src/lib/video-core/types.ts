/**
 * Marvedge Micro-SaaS — Shared Video Core Type Definitions
 * Strict TypeScript contracts for video probing, memory budgeting,
 * Web Worker messaging, and GIF encoding.
 */

// ============================================================================
// 1. VIDEO METADATA & PROBE TYPES
// ============================================================================

/**
 * Result of probing an input video file via browser APIs.
 * Note: Browser APIs cannot reliably detect every video codec;
 * codec compatibility is inferred from playback readiness and canPlayType.
 */
export interface VideoMetadata {
  /** Video duration in seconds */
  duration: number;
  /** Natural pixel width of the decoded video stream */
  width: number;
  /** Natural pixel height of the decoded video stream */
  height: number;
  /** Calculated aspect ratio (width / height) */
  aspectRatio: number;
  /**
   * Whether the video container contains at least one active audio track.
   * Note: Standard HTMLVideoElement metadata does not reliably report audio
   * tracks across all browsers without Web Audio context decoding; undefined if unknown.
   */
  hasAudio?: boolean;
  /** MIME type reported by the File object or container detection */
  mimeType: string;
  /** Whether the browser's native decoder can decode and play this media */
  isPlayable: boolean;
  /** Optional human-readable advisory if codec may cause issues (e.g., HEVC) */
  codecWarning?: string;
}

/**
 * Configuration options for probing a video file.
 */
export interface ProbeOptions {
  /** Maximum time in milliseconds to wait for loadedmetadata (default: 6000ms) */
  timeoutMs?: number;
}

// ============================================================================
// 2. ENCODING & PROCESSING OPTIONS
// ============================================================================

/**
 * Configuration parameters for extracting and encoding a video into a GIF.
 */
export interface EncodingOptions {
  /** Trim start time in seconds (must be >= 0) */
  startTime: number;
  /** Trim end time in seconds (must be > startTime and <= duration) */
  endTime: number;
  /** Output pixel width */
  width: number;
  /** Output pixel height */
  height: number;
  /** Target frame rate in frames per second (e.g., 5 to 25 FPS) */
  fps: number;
  /** Number of colors in the quantized palette (16 to 256) */
  colors: number;
  /** Maximum allowable trim duration in seconds (default: 20 seconds) */
  maxDuration?: number;
}

/**
 * Options passed to the memory guard evaluator.
 */
export interface MemoryBudgetOptions {
  /** Output pixel width */
  width: number;
  /** Output pixel height */
  height: number;
  /** Target frame rate (FPS) */
  fps: number;
  /** Trim duration in seconds */
  duration: number;
  /**
   * Configurable peak memory threshold in Megabytes.
   * Default: 150 MB (conservative baseline for Mobile Safari & low-spec devices).
   */
  thresholdMegabytes?: number;
}

/**
 * Output of a memory budget evaluation before processing begins.
 */
export interface MemoryBudgetEstimate {
  /** Estimated instantaneous peak working memory in bytes during active streaming */
  estimatedPeakBytes: number;
  /** Estimated instantaneous peak working memory in MB */
  estimatedPeakMegabytes: number;
  /** Cumulative theoretical uncompressed raw frame bytes: width * height * 4 * totalFrames */
  estimatedRawBytes: number;
  /** Cumulative raw bytes in Megabytes for analytical reporting */
  estimatedMegabytes: number;
  /** Estimated final compressed GIF buffer size in bytes */
  estimatedGifBytes: number;
  /** Total number of frames to be extracted and encoded */
  totalFrames: number;
  /** Configured safe memory threshold in MB */
  thresholdMegabytes: number;
  /** Whether the requested job is within safe client memory bounds */
  isSafe: boolean;
  /** Human-readable explanation when processing is rejected or cautioned */
  reason?: string;
  /** Machine-readable classification code */
  code?: "SAFE" | "EXCEEDS_BUDGET" | "INVALID_DIMENSIONS" | "INVALID_FRAMES" | "INVALID_BUDGET";
  /** Warning message if approaching device threshold */
  warning?: string;
}

// ============================================================================
// 3. WEB WORKER PROTOCOL (MESSAGING CONTRACTS)
// ============================================================================

/**
 * Commands sent from the Main Thread to the Background Web Worker.
 */
export type WorkerInMessage =
  | {
      type: "INIT";
      options: {
        width: number;
        height: number;
        colors: number;
        totalFrames: number;
      };
    }
  | {
      type: "ADD_FRAME";
      frameIndex: number;
      totalFrames: number;
      width: number;
      height: number;
      /** Transferable raw RGBA byte buffer from canvas getImageData() */
      rgbaBuffer: ArrayBuffer;
      delayMs: number;
    }
  | {
      type: "FINISH";
    }
  | {
      type: "ABORT";
    };

/**
 * Events and responses emitted from the Web Worker back to the Main Thread.
 */
export type WorkerOutMessage =
  | {
      type: "PROGRESS";
      /** Integer percentage (0 - 100) */
      percent: number;
      currentFrame: number;
      totalFrames: number;
    }
  | {
      type: "SUCCESS";
      /** Encoded GIF binary buffer */
      gifBuffer: ArrayBuffer;
      totalFrames: number;
      byteLength: number;
    }
  | {
      type: "ERROR";
      error: string;
      code?: string;
    }
  | {
      type: "ABORTED";
    };

// ============================================================================
// 4. HIGH-LEVEL CLIENT RESULT & CONTROLLER TYPES
// ============================================================================

/**
 * The final output of a completed video-to-GIF processing job.
 */
export interface VideoProcessResult {
  /** The final binary GIF Blob */
  blob: Blob;
  /** Browser object URL for preview and download */
  url: string;
  /** Sanitized output filename (e.g., "my-video.gif") */
  filename: string;
  /** Output file size in bytes */
  sizeBytes: number;
}

/**
 * Callback function signature for tracking encoding progress.
 */
export type ProgressCallback = (progress: {
  percent: number;
  currentFrame: number;
  totalFrames: number;
}) => void;
