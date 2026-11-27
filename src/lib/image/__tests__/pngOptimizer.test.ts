import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crc32, optimizeCanvasToPng } from "../pngOptimizer";
import { detectImageMimeType, readImageDimensions } from "../decodeImage";

function createMockCanvas(width: number, height: number, hasAlpha = false) {
  const pixelCount = width * height;
  const pixels = new Uint8ClampedArray(pixelCount * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 120; // R
    pixels[i + 1] = 60; // G
    pixels[i + 2] = 200; // B
    pixels[i + 3] = hasAlpha ? (i % 8 === 0 ? 128 : 255) : 255;
  }

  const getImageData = vi.fn().mockReturnValue({
    width,
    height,
    data: pixels,
  });

  const toBlob = vi.fn((cb: BlobCallback) => {
    // Return a dummy native blob larger than optimized output
    cb(new Blob([new Uint8Array(2000)], { type: "image/png" }));
  });

  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue({
      getImageData,
    }),
    toBlob,
  } as unknown as HTMLCanvasElement;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("pngOptimizer", () => {
  describe("crc32", () => {
    it("computes correct CRC32 for known PNG chunk identifiers", () => {
      const iendBytes = new TextEncoder().encode("IEND");
      const result = crc32(iendBytes);
      expect(result.toString(16)).toBe("ae426082");
    });

    it("computes CRC32 with offset and length parameters", () => {
      const buffer = new Uint8Array([0, 0, ...new TextEncoder().encode("IEND"), 99, 99]);
      const result = crc32(buffer, 2, 4);
      expect(result.toString(16)).toBe("ae426082");
    });
  });

  describe("optimizeCanvasToPng", () => {
    it("rejects canvas with non-positive dimensions", async () => {
      const canvas = { width: 0, height: 10 } as HTMLCanvasElement;
      await expect(optimizeCanvasToPng(canvas)).rejects.toThrow(/invalid canvas dimensions/i);

      const canvas2 = { width: 10, height: -1 } as HTMLCanvasElement;
      await expect(optimizeCanvasToPng(canvas2)).rejects.toThrow(/invalid canvas dimensions/i);
    });

    it("encodes 100% opaque image as 24-bit RGB (Color Type 2)", async () => {
      const canvas = createMockCanvas(8, 8, false); // No alpha
      const blob = await optimizeCanvasToPng(canvas, "default");

      expect(blob.type).toBe("image/png");
      const buffer = new Uint8Array(await blob.arrayBuffer());

      // Verify PNG signature
      expect(Array.from(buffer.slice(0, 8))).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      // Verify IHDR Color Type at byte 25 is 2 (RGB)
      expect(buffer[25]).toBe(2);

      // Verify decodeImage recognizes it as image/png with 8x8 dimensions
      expect(detectImageMimeType(buffer)).toBe("image/png");
      expect(readImageDimensions(buffer, "image/png")).toEqual({ width: 8, height: 8 });
    });

    it("encodes image with alpha channel as 32-bit RGBA (Color Type 6)", async () => {
      const canvas = createMockCanvas(8, 8, true); // Has alpha
      const blob = await optimizeCanvasToPng(canvas, "maximum");

      expect(blob.type).toBe("image/png");
      const buffer = new Uint8Array(await blob.arrayBuffer());

      // Verify PNG signature
      expect(Array.from(buffer.slice(0, 8))).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      // Verify IHDR Color Type at byte 25 is 6 (RGBA)
      expect(buffer[25]).toBe(6);

      expect(detectImageMimeType(buffer)).toBe("image/png");
      expect(readImageDimensions(buffer, "image/png")).toEqual({ width: 8, height: 8 });
    });

    it("supports fast optimization level", async () => {
      const canvas = createMockCanvas(16, 16, false);
      const blob = await optimizeCanvasToPng(canvas, "fast");

      expect(blob.type).toBe("image/png");
      const buffer = new Uint8Array(await blob.arrayBuffer());
      expect(detectImageMimeType(buffer)).toBe("image/png");
      expect(readImageDimensions(buffer, "image/png")).toEqual({ width: 16, height: 16 });
    });

    it("falls back to native canvas toBlob if CompressionStream is undefined", async () => {
      vi.stubGlobal("CompressionStream", undefined);

      const canvas = createMockCanvas(4, 4);
      const blob = await optimizeCanvasToPng(canvas);

      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
      expect(blob.type).toBe("image/png");
    });

    it("falls back to native toBlob if getContext returns null", async () => {
      const canvas = {
        width: 10,
        height: 10,
        getContext: vi.fn().mockReturnValue(null),
        toBlob: vi.fn((cb) => cb(new Blob(["fallback"], { type: "image/png" }))),
      } as unknown as HTMLCanvasElement;

      const blob = await optimizeCanvasToPng(canvas);
      expect(canvas.toBlob).toHaveBeenCalled();
      expect(blob.type).toBe("image/png");
    });

    it("falls back to native toBlob if getImageData throws (e.g. tainted canvas)", async () => {
      const canvas = {
        width: 10,
        height: 10,
        getContext: vi.fn().mockReturnValue({
          getImageData: vi.fn().mockImplementation(() => {
            throw new Error("Tainted canvas");
          }),
        }),
        toBlob: vi.fn((cb) => cb(new Blob(["fallback"], { type: "image/png" }))),
      } as unknown as HTMLCanvasElement;

      const blob = await optimizeCanvasToPng(canvas);
      expect(canvas.toBlob).toHaveBeenCalled();
      expect(blob.type).toBe("image/png");
    });

    it("selects native canvas blob if native blob is smaller than optimized blob", async () => {
      const canvas = createMockCanvas(10, 10, false);
      // Mock native toBlob to return a tiny 1-byte blob
      canvas.toBlob = vi.fn((cb: BlobCallback) => {
        cb(new Blob(["x"], { type: "image/png" }));
      });

      const blob = await optimizeCanvasToPng(canvas);
      expect(blob.size).toBe(1); // returned the smaller native blob
    });
  });
});
