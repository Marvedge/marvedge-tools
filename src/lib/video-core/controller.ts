/**
 * Marvedge Micro-SaaS — Shared Video Core Controller
 *
 * Coordinates frame extraction from HTMLVideoElement, memory pre-flight budgeting,
 * zero-copy buffer transfer to Web Worker, seek timeout protection, and cancellation.
 */

import type {
  EncodingOptions,
  VideoProcessResult,
  ProgressCallback,
  WorkerOutMessage,
} from "./types";
import { estimateMemoryBudget } from "./memory-guard";

/** Maximum time in milliseconds to wait for a single video seek operation */
export const SEEK_TIMEOUT_MS = 5000;

/**
 * Helper to seek a video element to a specific timestamp with a timeout guard.
 */
export function seekVideo(
  video: HTMLVideoElement,
  timestamp: number,
  timeoutMs = SEEK_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already at timestamp and ready, resolve immediately
    if (Math.abs(video.currentTime - timestamp) < 0.01 && video.readyState >= 2) {
      return resolve();
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      video.onseeked = null;
      video.onerror = null;
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Seek to ${timestamp.toFixed(2)}s timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    video.onseeked = () => {
      cleanup();
      resolve();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Error seeking video to ${timestamp.toFixed(2)}s.`));
    };

    video.currentTime = timestamp;
  });
}

/**
 * Creates a Web Worker instance. Compatible with Vite's ESM module worker syntax.
 */
export function createVideoWorker(): Worker {
  return new Worker(new URL("./video.worker.ts", import.meta.url), { type: "module" });
}

export interface EncodeGifParams {
  video: HTMLVideoElement;
  filename: string;
  options: EncodingOptions;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  /** Optional custom worker factory for testing */
  workerFactory?: () => Worker;
  /** Optional custom seek function for testing */
  seekFn?: (video: HTMLVideoElement, timestamp: number) => Promise<void>;
}

/**
 * Extracts frames from an HTMLVideoElement and encodes them into a GIF via Web Worker.
 */
export async function encodeVideoToGif({
  video,
  filename,
  options,
  onProgress,
  signal,
  workerFactory = createVideoWorker,
  seekFn = seekVideo,
}: EncodeGifParams): Promise<VideoProcessResult> {
  const { startTime, endTime, width, height, fps, colors } = options;
  const duration = endTime - startTime;

  // 1. Check signal before starting
  if (signal?.aborted) {
    throw new DOMException("Encoding aborted by user", "AbortError");
  }

  // 2. Pre-flight Memory Budget Check
  const budget = estimateMemoryBudget({
    width,
    height,
    fps,
    duration,
  });

  if (!budget.isSafe) {
    throw new Error(
      budget.reason ?? "Memory budget exceeded for the requested dimensions and duration.",
    );
  }

  // 3. Prepare Canvas for Frame Extraction
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context for frame extraction.");
  }

  const totalFrames = budget.totalFrames;
  const delayMs = Math.round(1000 / fps);

  // 4. Initialize Background Web Worker
  const worker = workerFactory();

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", handleAbort);
      worker.terminate();
      canvas.width = 0;
      canvas.height = 0;
    };

    const handleAbort = () => {
      try {
        worker.postMessage({ type: "ABORT" });
      } catch {
        // Worker may already be terminating
      }
      cleanup();
      reject(new DOMException("Encoding aborted by user", "AbortError"));
    };

    signal?.addEventListener("abort", handleAbort);

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (!msg) return;

      switch (msg.type) {
        case "PROGRESS": {
          onProgress?.({
            percent: msg.percent,
            currentFrame: msg.currentFrame,
            totalFrames: msg.totalFrames,
          });
          break;
        }

        case "SUCCESS": {
          const blob = new Blob([msg.gifBuffer], { type: "image/gif" });
          const url = URL.createObjectURL(blob);
          const sanitizedName = filename.replace(/\.[^.]+$/, "") + ".gif";

          cleanup();
          resolve({
            blob,
            url,
            filename: sanitizedName,
            sizeBytes: msg.byteLength,
          });
          break;
        }

        case "ERROR": {
          cleanup();
          reject(new Error(msg.error));
          break;
        }

        case "ABORTED": {
          cleanup();
          reject(new DOMException("Encoding aborted by user", "AbortError"));
          break;
        }
      }
    };

    worker.onerror = (err) => {
      cleanup();
      reject(new Error(`Worker execution error: ${err.message}`));
    };

    // 5. Send INIT to Worker
    worker.postMessage({
      type: "INIT",
      options: {
        width,
        height,
        colors,
        totalFrames,
      },
    });

    // 6. Sequential Frame Extraction & Streaming Transfer
    (async () => {
      try {
        try {
          if (typeof video.pause === "function") {
            video.pause();
          }
        } catch {
          // Safe fallback for test environments
        }

        for (let i = 0; i < totalFrames; i++) {
          if (signal?.aborted || settled) {
            return;
          }

          const targetTime = startTime + i / fps;
          await seekFn(video, targetTime);

          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Zero-copy transfer: transfer the underlying ArrayBuffer
          const buffer = imageData.data.buffer;

          worker.postMessage(
            {
              type: "ADD_FRAME",
              frameIndex: i,
              totalFrames,
              width,
              height,
              rgbaBuffer: buffer,
              delayMs,
            },
            [buffer],
          );
        }

        // 7. All frames dispatched — request FINISH
        if (!settled && !signal?.aborted) {
          worker.postMessage({ type: "FINISH" });
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}
