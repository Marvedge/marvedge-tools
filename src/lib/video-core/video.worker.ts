/**
 * Marvedge Micro-SaaS — Shared Video Core Web Worker
 *
 * Runs off the main UI thread. Handles color palette quantization,
 * palette indexing, and GIF frame encoding via `gifenc`.
 * Emits progress messages after each frame is written.
 */

import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;

import type { WorkerInMessage, WorkerOutMessage } from "./types";

// State held inside the worker instance
let encoder: ReturnType<typeof GIFEncoder> | null = null;
let currentWidth = 0;
let currentHeight = 0;
let currentColorDepth = 128;
let framesProcessed = 0;
let isAborted = false;

function post(msg: WorkerOutMessage, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    (self.postMessage as (message: unknown, transfer: Transferable[]) => void)(msg, transfer);
  } else {
    (self.postMessage as (message: unknown) => void)(msg);
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "INIT": {
      isAborted = false;
      framesProcessed = 0;
      currentWidth = msg.options.width;
      currentHeight = msg.options.height;
      currentColorDepth = msg.options.colors;

      try {
        encoder = GIFEncoder();
      } catch (err) {
        post({
          type: "ERROR",
          error: `Failed to initialize GIF encoder: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      break;
    }

    case "ADD_FRAME": {
      if (isAborted) return;

      if (!encoder) {
        post({
          type: "ERROR",
          error: "Encoder has not been initialized. Send INIT message before frames.",
        });
        return;
      }

      try {
        const { frameIndex, totalFrames, width, height, rgbaBuffer, delayMs } = msg;

        // Wrap the transferred buffer into a typed array
        const rgbaClamped = new Uint8ClampedArray(rgbaBuffer);

        // 1. Quantize 32-bit RGBA to optimal color palette
        const palette = quantize(rgbaClamped, currentColorDepth);

        // 2. Map pixel colors to palette indices
        const index = applyPalette(rgbaClamped, palette);

        // 3. Write frame into GIF byte stream
        encoder.writeFrame(index, width, height, {
          palette,
          delay: delayMs,
        });

        framesProcessed++;
        const percent = Math.min(100, Math.round((framesProcessed / totalFrames) * 100));

        post({
          type: "PROGRESS",
          percent,
          currentFrame: frameIndex + 1,
          totalFrames,
        });
      } catch (err) {
        post({
          type: "ERROR",
          error: `Frame encoding error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      break;
    }

    case "FINISH": {
      if (isAborted) return;

      if (!encoder) {
        post({
          type: "ERROR",
          error: "Encoder is not initialized.",
        });
        return;
      }

      try {
        encoder.finish();
        const bytes = encoder.bytes();
        const byteLength = bytes.byteLength;

        // Extract transferable ArrayBuffer slice
        const copyBuffer = new ArrayBuffer(byteLength);
        new Uint8Array(copyBuffer).set(bytes);

        post(
          {
            type: "SUCCESS",
            gifBuffer: copyBuffer,
            totalFrames: framesProcessed,
            byteLength,
          },
          [copyBuffer],
        );

        encoder = null;
      } catch (err) {
        post({
          type: "ERROR",
          error: `Failed to finalize GIF output: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      break;
    }

    case "ABORT": {
      isAborted = true;
      encoder = null;
      framesProcessed = 0;
      post({ type: "ABORTED" });
      break;
    }
  }
};
