import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canvasToBlob } from "../canvasToBlob";
import { correctImageOrientation } from "../correctImageOrientation";
import {
  decodeImage,
  detectImageMimeType,
  readImageDimensions,
} from "../decodeImage";
import { downloadBlob, sanitizeDownloadFilename } from "../downloadBlob";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function makePngBlob(width = 2, height = 3, declaredType = "image/png"): Blob {
  const bytes = new Uint8Array(24);
  bytes.set(PNG_SIGNATURE, 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8); // chunk length = 13
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return new Blob([bytes], { type: declaredType });
}

function makeAvifHeader(): Blob {
  const bytes = new Uint8Array(20);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 20, false);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
  bytes.set([0x61, 0x76, 0x69, 0x66], 8); // avif
  return new Blob([bytes], { type: "image/avif" });
}

function makeJpegBlob(width = 16, height = 8, declaredType = "image/jpeg"): Blob {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, // SOI, APP0
    0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, // SOF0, segment length, precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9, // EOI
  ]);
  return new Blob([bytes], { type: declaredType });
}

function makeWebpBlob(width = 16, height = 8, declaredType = "image/webp"): Blob {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  bytes.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
  bytes[24] = (width - 1) & 0xff;
  bytes[25] = ((width - 1) >> 8) & 0xff;
  bytes[26] = ((width - 1) >> 16) & 0xff;
  bytes[27] = (height - 1) & 0xff;
  bytes[28] = ((height - 1) >> 8) & 0xff;
  bytes[29] = ((height - 1) >> 16) & 0xff;
  return new Blob([bytes], { type: declaredType });
}

function makeBmpBlob(width = 16, height = 8, declaredType = "image/bmp"): Blob {
  const bytes = new Uint8Array(26);
  bytes.set([0x42, 0x4d], 0); // BM
  const view = new DataView(bytes.buffer);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  return new Blob([bytes], { type: declaredType });
}

function makeBitmap(width: number, height: number) {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Provide a default mock for createImageBitmap in Node environment
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(makeBitmap(10, 10)));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("decodeImage", () => {
  describe("1. Valid JPEG, PNG, and WebP inputs", () => {
    it("decodes a valid PNG and requests EXIF orientation", async () => {
      const bitmap = makeBitmap(2, 3);
      const decoder = vi.fn().mockResolvedValue(bitmap);
      vi.stubGlobal("createImageBitmap", decoder);

      const result = await decodeImage(makePngBlob() as File);

      expect(result).toBe(bitmap);
      expect(decoder).toHaveBeenCalledWith(expect.any(Blob), {
        imageOrientation: "from-image",
      });
    });

    it("decodes a valid JPEG file", async () => {
      const bitmap = makeBitmap(16, 8);
      const decoder = vi.fn().mockResolvedValue(bitmap);
      vi.stubGlobal("createImageBitmap", decoder);

      const result = await decodeImage(makeJpegBlob() as File);
      expect(result).toBe(bitmap);
    });

    it("decodes a valid WebP file", async () => {
      const bitmap = makeBitmap(16, 8);
      const decoder = vi.fn().mockResolvedValue(bitmap);
      vi.stubGlobal("createImageBitmap", decoder);

      const result = await decodeImage(makeWebpBlob() as File);
      expect(result).toBe(bitmap);
    });

    it("decodes a valid BMP file", async () => {
      const bitmap = makeBitmap(16, 8);
      const decoder = vi.fn().mockResolvedValue(bitmap);
      vi.stubGlobal("createImageBitmap", decoder);

      const result = await decodeImage(makeBmpBlob() as File);
      expect(result).toBe(bitmap);
    });
  });

  describe("2. Unsupported formats", () => {
    it("rejects SVG files even if declared as image/svg+xml", async () => {
      const svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], {
        type: "image/svg+xml",
      });
      await expect(decodeImage(svg as File)).rejects.toThrow(/unsupported or invalid image content/i);
    });

    it("rejects GIF files (still-image helper does not accept GIF)", async () => {
      const gif = new Blob(["GIF89a\x01\x00\x01\x00"], { type: "image/gif" });
      await expect(decodeImage(gif as File)).rejects.toThrow(/unsupported or invalid image content/i);
    });

    it("rejects PDF documents", async () => {
      const pdf = new Blob(["%PDF-1.4\n1 0 obj"], { type: "application/pdf" });
      await expect(decodeImage(pdf as File)).rejects.toThrow(/unsupported or invalid image content/i);
    });

    it("rejects plain text files", async () => {
      const txt = new Blob(["Hello world!"], { type: "text/plain" });
      await expect(decodeImage(txt as File)).rejects.toThrow(/unsupported or invalid image content/i);
    });
  });

  describe("3. Empty files", () => {
    it("rejects empty image files (0 bytes) before calling decoder", async () => {
      const decoder = vi.fn();
      vi.stubGlobal("createImageBitmap", decoder);

      await expect(decodeImage(new Blob([], { type: "image/png" }) as File)).rejects.toThrow(/empty/i);
      expect(decoder).not.toHaveBeenCalled();
    });
  });

  describe("4. Corrupt image files", () => {
    it("rejects when sliced header buffer cannot be read", async () => {
      const corruptFile = {
        size: 1024,
        type: "image/png",
        arrayBuffer: () => Promise.reject(new Error("Disk I/O failure")),
        slice: () => ({
          arrayBuffer: () => Promise.reject(new Error("Disk I/O failure")),
        }),
      } as unknown as File;

      await expect(decodeImage(corruptFile)).rejects.toThrow(/could not be read/i);
    });

    it("rejects files with corrupt headers that do not match known magic signatures", async () => {
      const corrupt = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])], {
        type: "image/png",
      });
      await expect(decodeImage(corrupt as File)).rejects.toThrow(/unsupported or invalid image content/i);
    });
  });

  describe("5. MIME type mismatches and aliases", () => {
    it("rejects when declared image format directly conflicts with detected format", async () => {
      const decoder = vi.fn();
      vi.stubGlobal("createImageBitmap", decoder);

      // PNG bytes with declared image/jpeg
      await expect(decodeImage(makePngBlob(2, 3, "image/jpeg") as File)).rejects.toThrow(
        /does not match its declared image format/i,
      );
      expect(decoder).not.toHaveBeenCalled();
    });

    it("accepts compatible MIME aliases such as image/jpg for JPEG", async () => {
      const bitmap = makeBitmap(16, 8);
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

      const result = await decodeImage(makeJpegBlob(16, 8, "image/jpg") as File);
      expect(result).toBe(bitmap);
    });

    it("accepts compatible MIME aliases such as image/x-png for PNG", async () => {
      const bitmap = makeBitmap(2, 3);
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

      const result = await decodeImage(makePngBlob(2, 3, "image/x-png") as File);
      expect(result).toBe(bitmap);
    });

    it("allows files with generic application/octet-stream or empty declared type if magic bytes match", async () => {
      const bitmap = makeBitmap(2, 3);
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

      const result = await decodeImage(makePngBlob(2, 3, "") as File);
      expect(result).toBe(bitmap);
    });
  });

  describe("6. Maximum file-size validation", () => {
    it("rejects files exceeding maxFileSizeBytes before reading or decoding", async () => {
      const decoder = vi.fn();
      vi.stubGlobal("createImageBitmap", decoder);

      await expect(
        decodeImage(makePngBlob() as File, { maxFileSizeBytes: 10 }),
      ).rejects.toThrow(/exceeds the allowed file size/i);
      expect(decoder).not.toHaveBeenCalled();
    });

    it("rejects non-positive maxFileSizeBytes options", async () => {
      await expect(
        decodeImage(makePngBlob() as File, { maxFileSizeBytes: -50 }),
      ).rejects.toThrow(/maxFileSizeBytes must be a positive safe integer/i);
    });
  });

  describe("7. Maximum pixel-count validation", () => {
    it("rejects oversized PNGs based on IHDR header dimensions before decoding", async () => {
      const decoder = vi.fn();
      vi.stubGlobal("createImageBitmap", decoder);

      await expect(
        decodeImage(makePngBlob(100, 100) as File, { maxPixelCount: 9_999 }),
      ).rejects.toThrow(/exceeds the allowed pixel count/i);
      expect(decoder).not.toHaveBeenCalled();
    });

    it("rejects oversized JPEGs based on SOF header dimensions before decoding", async () => {
      const decoder = vi.fn();
      vi.stubGlobal("createImageBitmap", decoder);

      await expect(
        decodeImage(makeJpegBlob(200, 200) as File, { maxPixelCount: 30_000 }),
      ).rejects.toThrow(/exceeds the allowed pixel count/i);
      expect(decoder).not.toHaveBeenCalled();
    });

    it("falls back to checking decoded dimensions when header does not specify them", async () => {
      const bitmap = makeBitmap(50, 50);
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

      await expect(
        decodeImage(makeAvifHeader() as File, { maxPixelCount: 2000 }),
      ).rejects.toThrow(/exceeds the allowed pixel count/i);
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    });

    it("rejects non-positive maxPixelCount options", async () => {
      await expect(
        decodeImage(makePngBlob() as File, { maxPixelCount: 0 }),
      ).rejects.toThrow(/maxPixelCount must be a positive safe integer/i);
    });
  });

  describe("8. Resource cleanup and decoder failure handling", () => {
    it("closes the bitmap and throws when decoded dimensions are invalid (<= 0)", async () => {
      const bitmap = makeBitmap(0, 10);
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));

      await expect(decodeImage(makeAvifHeader() as File)).rejects.toThrow(/invalid dimensions/i);
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    });

    it("falls back to decode without options if imageOrientation option is rejected", async () => {
      const bitmap = makeBitmap(10, 10);
      const decoder = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Invalid option: imageOrientation"))
        .mockResolvedValueOnce(bitmap);
      vi.stubGlobal("createImageBitmap", decoder);

      const result = await decodeImage(makePngBlob() as File);
      expect(result).toBe(bitmap);
      expect(decoder).toHaveBeenCalledTimes(2);
    });

    it("throws helpful error when browser decoder fails completely", async () => {
      vi.stubGlobal(
        "createImageBitmap",
        vi.fn().mockRejectedValue(new Error("Decoding failed")),
      );

      await expect(decodeImage(makePngBlob() as File)).rejects.toThrow(
        /could not be decoded as an image/i,
      );
    });

    it("throws when createImageBitmap is not supported in the environment", async () => {
      vi.stubGlobal("createImageBitmap", undefined);

      await expect(decodeImage(makePngBlob() as File)).rejects.toThrow(
        /does not support createImageBitmap/i,
      );
    });

    it("rejects invalid input types", async () => {
      vi.stubGlobal("createImageBitmap", vi.fn());
      await expect(decodeImage(null as unknown as File)).rejects.toThrow(TypeError);
      await expect(decodeImage({} as unknown as File)).rejects.toThrow(TypeError);
    });
  });

  describe("Header dimension parsing unit tests", () => {
    it("reads dimensions from VP8X WebP header", () => {
      const webp = makeWebpBlob(120, 80);
      return webp.arrayBuffer().then((buf) => {
        const dims = readImageDimensions(new Uint8Array(buf), "image/webp");
        expect(dims).toEqual({ width: 120, height: 80 });
      });
    });

    it("reads dimensions from BMP header", () => {
      const bmp = makeBmpBlob(300, 200);
      return bmp.arrayBuffer().then((buf) => {
        const dims = readImageDimensions(new Uint8Array(buf), "image/bmp");
        expect(dims).toEqual({ width: 300, height: 200 });
      });
    });

    it("detects formats from magic bytes", () => {
      expect(detectImageMimeType(new Uint8Array(PNG_SIGNATURE))).toBe("image/png");
      expect(detectImageMimeType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
      expect(detectImageMimeType(new Uint8Array([0x42, 0x4d]))).toBe("image/bmp");
      expect(detectImageMimeType(new Uint8Array([0x00, 0x00, 0x00]))).toBeNull();
    });
  });
});

describe("correctImageOrientation", () => {
  describe("8. EXIF orientation handling and avoiding double-rotation", () => {
    it("copies already-oriented bitmap pixels to canvas at identical visual dimensions", () => {
      const drawImage = vi.fn();
      const context = { drawImage };
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(context),
      } as unknown as HTMLCanvasElement;
      const createElement = vi.fn().mockReturnValue(canvas);
      vi.stubGlobal("document", { createElement });
      const bitmap = makeBitmap(640, 480);

      const result = correctImageOrientation(bitmap);

      expect(result).toBe(canvas);
      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
      // Pixels are drawn at 0, 0 without an additional transform, avoiding double-rotation
      expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    });

    it("materializes pixels at mocked pre-oriented dimensions for expected EXIF cases (1 through 8) without applying additional rotation", () => {
      // Orientations 1-4 preserve dimensions (e.g. 800x600 landscape or 600x800 portrait)
      // Orientations 5-8 swap visual dimensions (e.g. original 800x600 becomes 600x800 after decode)
      const orientations = [
        { id: 1, name: "Normal (0°)", width: 800, height: 600 },
        { id: 2, name: "Flip Horizontal", width: 800, height: 600 },
        { id: 3, name: "Rotate 180°", width: 800, height: 600 },
        { id: 4, name: "Flip Vertical", width: 800, height: 600 },
        { id: 5, name: "Transpose", width: 600, height: 800 },
        { id: 6, name: "Rotate 90° CW", width: 600, height: 800 },
        { id: 7, name: "Transverse", width: 600, height: 800 },
        { id: 8, name: "Rotate 270° CW", width: 600, height: 800 },
      ];

      for (const orientation of orientations) {
        const drawImage = vi.fn();
        const canvas = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({ drawImage }),
        } as unknown as HTMLCanvasElement;
        vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

        const bitmap = makeBitmap(orientation.width, orientation.height);
        const result = correctImageOrientation(bitmap);

        expect(result.width).toBe(orientation.width);
        expect(result.height).toBe(orientation.height);
        expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
      }
    });
  });

  describe("9. Portrait, landscape, and square images", () => {
    it("handles portrait images correctly (height > width)", () => {
      const drawImage = vi.fn();
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

      const portraitBitmap = makeBitmap(1080, 1920);
      const result = correctImageOrientation(portraitBitmap);

      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
      expect(drawImage).toHaveBeenCalledWith(portraitBitmap, 0, 0);
    });

    it("handles landscape images correctly (width > height)", () => {
      const drawImage = vi.fn();
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

      const landscapeBitmap = makeBitmap(1920, 1080);
      const result = correctImageOrientation(landscapeBitmap);

      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(drawImage).toHaveBeenCalledWith(landscapeBitmap, 0, 0);
    });

    it("handles square images correctly (width === height)", () => {
      const drawImage = vi.fn();
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

      const squareBitmap = makeBitmap(512, 512);
      const result = correctImageOrientation(squareBitmap);

      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      expect(drawImage).toHaveBeenCalledWith(squareBitmap, 0, 0);
    });
  });

  describe("Orientation error handling and missing APIs", () => {
    it("throws when document is not available", () => {
      vi.stubGlobal("document", undefined);
      expect(() => correctImageOrientation(makeBitmap(10, 10))).toThrow(
        /requires a browser document/i,
      );
    });

    it("throws when 2D canvas context cannot be created", () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

      expect(() => correctImageOrientation(makeBitmap(10, 10))).toThrow(
        /could not create a 2D canvas context/i,
      );
    });

    it("throws when drawImage throws", () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: () => {
            throw new Error("Canvas error");
          },
        }),
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(canvas) });

      expect(() => correctImageOrientation(makeBitmap(10, 10))).toThrow(
        /could not be copied to the canvas/i,
      );
    });

    it("rejects invalid bitmap dimensions", () => {
      vi.stubGlobal("document", { createElement: vi.fn() });
      expect(() => correctImageOrientation(makeBitmap(0, 1))).toThrow(/valid dimensions/i);
      expect(() => correctImageOrientation(makeBitmap(-5, 10))).toThrow(/valid dimensions/i);
      expect(() => correctImageOrientation(null as unknown as ImageBitmap)).toThrow(/valid dimensions/i);
    });
  });
});

describe("canvasToBlob", () => {
  describe("10. Canvas export formats and transparency handling", () => {
    it("exports PNG format by default", async () => {
      const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob(["png-data"], { type: type ?? "image/png" }));
      });
      const canvas = { width: 20, height: 10, toBlob } as unknown as HTMLCanvasElement;

      const result = await canvasToBlob(canvas);
      expect(result.type).toBe("image/png");
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined);
    });

    it("exports WebP format with quality setting", async () => {
      const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob(["webp-data"], { type }));
      });
      const canvas = { width: 20, height: 10, toBlob } as unknown as HTMLCanvasElement;

      const result = await canvasToBlob(canvas, { type: "image/webp", quality: 0.85 });
      expect(result.type).toBe("image/webp");
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.85);
    });

    it("flattens transparency with white background by default when exporting to JPEG", async () => {
      const fillRect = vi.fn();
      const drawImage = vi.fn();
      const exportToBlob = vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob(["jpeg-data"], { type }));
      });

      const compositedCanvas = {
        width: 100,
        height: 50,
        getContext: vi.fn().mockReturnValue({
          fillStyle: "",
          fillRect,
          drawImage,
        }),
        toBlob: exportToBlob,
      } as unknown as HTMLCanvasElement;

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(compositedCanvas),
      });

      const sourceCanvas = {
        width: 100,
        height: 50,
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement;

      const result = await canvasToBlob(sourceCanvas, { type: "image/jpeg", quality: 0.9 });

      expect(result.type).toBe("image/jpeg");
      expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
      expect(drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
      expect(exportToBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.9);
    });

    it("allows custom background color for transparency flattening", async () => {
      const fillRect = vi.fn();
      let usedFillStyle = "";
      const ctx = {
        set fillStyle(val: string) {
          usedFillStyle = val;
        },
        get fillStyle() {
          return usedFillStyle;
        },
        fillRect,
        drawImage: vi.fn(),
      };

      const compositedCanvas = {
        width: 50,
        height: 50,
        getContext: vi.fn().mockReturnValue(ctx),
        toBlob: (callback: BlobCallback, type?: string) => {
          callback(new Blob(["data"], { type }));
        },
      } as unknown as HTMLCanvasElement;

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(compositedCanvas),
      });

      const sourceCanvas = { width: 50, height: 50, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await canvasToBlob(sourceCanvas, {
        type: "image/jpeg",
        backgroundColor: "#123456",
      });

      expect(usedFillStyle).toBe("#123456");
    });

    it("rejects invalid background color values", async () => {
      const sourceCanvas = { width: 50, height: 50, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg", backgroundColor: "invalid-color" }),
      ).rejects.toThrow(/not a valid CSS color/i);

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/png", backgroundColor: "#12" }),
      ).rejects.toThrow(/not a valid CSS color/i);
    });

    it("rejects non-opaque background colors when exporting to JPEG to ensure opaque output", async () => {
      const sourceCanvas = { width: 50, height: 50, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg", backgroundColor: "transparent" }),
      ).rejects.toThrow(/JPEG background compositing requires an opaque color/i);

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg", backgroundColor: "rgba(0, 0, 0, 0)" }),
      ).rejects.toThrow(/JPEG background compositing requires an opaque color/i);

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg", backgroundColor: "#ffffff00" }),
      ).rejects.toThrow(/JPEG background compositing requires an opaque color/i);

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg", backgroundColor: "rgba(255, 0, 0, 0.5)" }),
      ).rejects.toThrow(/JPEG background compositing requires an opaque color/i);
    });

    it("rejects when 2D context cannot be obtained for compositing and does not export unflattened canvas", async () => {
      const compositedCanvas = {
        width: 100,
        height: 50,
        getContext: vi.fn().mockReturnValue(null),
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement;

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(compositedCanvas),
      });

      const sourceCanvas = {
        width: 100,
        height: 50,
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement;

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg" }),
      ).rejects.toThrow(/could not create a 2D canvas context for background compositing/i);

      // Verify unflattened canvas was never exported as JPEG
      expect(sourceCanvas.toBlob).not.toHaveBeenCalled();
      expect(compositedCanvas.toBlob).not.toHaveBeenCalled();
    });

    it("rejects when canvas drawing fails during compositing and does not export unflattened canvas", async () => {
      const compositedCanvas = {
        width: 100,
        height: 50,
        getContext: vi.fn().mockReturnValue({
          fillStyle: "",
          fillRect: vi.fn(),
          drawImage: () => {
            throw new Error("Draw failed");
          },
        }),
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement;

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(compositedCanvas),
      });

      const sourceCanvas = {
        width: 100,
        height: 50,
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement;

      await expect(
        canvasToBlob(sourceCanvas, { type: "image/jpeg" }),
      ).rejects.toThrow(/failed to draw the image onto the composited canvas background/i);

      expect(sourceCanvas.toBlob).not.toHaveBeenCalled();
      expect(compositedCanvas.toBlob).not.toHaveBeenCalled();
    });
  });

  describe("11. Unsupported export formats and fallback detection", () => {
    it("rejects if the browser silently falls back to PNG for an unsupported requested MIME", async () => {
      const canvas = {
        width: 10,
        height: 10,
        toBlob: (callback: BlobCallback) =>
          callback(new Blob(["fallback"], { type: "image/png" })),
      } as unknown as HTMLCanvasElement;

      await expect(canvasToBlob(canvas, { type: "image/webp" })).rejects.toThrow(
        /does not support exporting image\/webp/i,
      );
    });

    it("rejects unsupported MIME types passed as arguments", async () => {
      const canvas = { width: 10, height: 10, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await expect(
        canvasToBlob(canvas, { type: "image/gif" as unknown as "image/png" }),
      ).rejects.toThrow(/unsupported canvas output type/i);
    });
  });

  describe("14 & 15. Missing browser APIs and canvas export failure handling", () => {
    it("rejects when canvas.toBlob is not supported in the browser", async () => {
      const canvas = { width: 10, height: 10, toBlob: undefined } as unknown as HTMLCanvasElement;
      await expect(canvasToBlob(canvas)).rejects.toThrow(/does not support canvas\.toBlob/i);
    });

    it("rejects when toBlob returns a null blob", async () => {
      const canvas = {
        width: 10,
        height: 10,
        toBlob: (callback: BlobCallback) => callback(null),
      } as unknown as HTMLCanvasElement;

      await expect(canvasToBlob(canvas)).rejects.toThrow(/failed to export the canvas/i);
    });

    it("rejects when canvas is tainted by cross-origin content (SecurityError)", async () => {
      const canvas = {
        width: 10,
        height: 10,
        toBlob: () => {
          throw new Error("SecurityError: The operation is insecure.");
        },
      } as unknown as HTMLCanvasElement;

      await expect(canvasToBlob(canvas)).rejects.toThrow(/tainted by cross-origin content/i);
    });

    it("rejects invalid dimensions and quality values", async () => {
      const canvasZero = { width: 0, height: 10, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await expect(canvasToBlob(canvasZero)).rejects.toThrow(/non-zero dimensions/i);

      const validCanvas = { width: 10, height: 10, toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      await expect(canvasToBlob(validCanvas, { quality: 1.5 })).rejects.toThrow(/quality/i);
      await expect(canvasToBlob(validCanvas, { quality: -0.1 })).rejects.toThrow(/quality/i);
      await expect(canvasToBlob(validCanvas, { quality: NaN })).rejects.toThrow(/quality/i);
    });
  });
});

describe("safe download", () => {
  describe("12. Download filename sanitization", () => {
    it("sanitizes path separators, illegal characters, and control characters", () => {
      expect(sanitizeDownloadFilename("folder\\CON.pdf")).toBe("folder_CON.pdf");
      expect(sanitizeDownloadFilename("my/cool:file*name?.png")).toBe("my_cool_file_name_.png");
      expect(sanitizeDownloadFilename("test\x00file\x1fname.jpg")).toBe("test_file_name.jpg");
    });

    it("sanitizes reserved Windows device names", () => {
      expect(sanitizeDownloadFilename("CON.pdf")).toBe("_CON.pdf");
      expect(sanitizeDownloadFilename("aux.png")).toBe("_aux.png");
      expect(sanitizeDownloadFilename("prn.jpg")).toBe("_prn.jpg");
      expect(sanitizeDownloadFilename("nul")).toBe("_nul");
      expect(sanitizeDownloadFilename("com1.webp")).toBe("_com1.webp");
      expect(sanitizeDownloadFilename("lpt9.tar.gz")).toBe("_lpt9.tar.gz");
    });

    it("handles dot-leading filenames without base names", () => {
      expect(sanitizeDownloadFilename(".png")).toBe("download.png");
      expect(sanitizeDownloadFilename("..jpeg")).toBe("download..jpeg");
    });

    it("returns 'download' for empty, whitespace, or dot-only filenames", () => {
      expect(sanitizeDownloadFilename("")).toBe("download");
      expect(sanitizeDownloadFilename("   ")).toBe("download");
      expect(sanitizeDownloadFilename(".")).toBe("download");
      expect(sanitizeDownloadFilename("..")).toBe("download");
      expect(sanitizeDownloadFilename("...   ...")).toBe("download");
    });

    it("truncates excessively long filenames while preserving the extension", () => {
      const longBase = "a".repeat(200);
      const sanitized = sanitizeDownloadFilename(`${longBase}.jpeg`);
      expect(sanitized.length).toBeLessThanOrEqual(180);
      expect(sanitized.endsWith(".jpeg")).toBe(true);
    });

    it("rejects non-string filename inputs", () => {
      expect(() => sanitizeDownloadFilename(123 as unknown as string)).toThrow(TypeError);
      expect(() => sanitizeDownloadFilename(null as unknown as string)).toThrow(TypeError);
    });
  });

  describe("13. Blob URL creation, download trigger, and cleanup", () => {
    it("creates a download link and revokes its object URL after delay", () => {
      const click = vi.fn();
      const remove = vi.fn();
      const anchor = {
        href: "",
        download: "",
        rel: "",
        style: { display: "" },
        click,
        remove,
      };
      const appendChild = vi.fn();
      const setTimeoutSpy = vi.fn();
      vi.stubGlobal("document", {
        body: { appendChild },
        createElement: vi.fn().mockReturnValue(anchor),
      });
      vi.stubGlobal("setTimeout", setTimeoutSpy);
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-image");
      const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      downloadBlob(new Blob(["image"]), "my/image?.png", { revokeAfterMs: 500 });

      expect(anchor.download).toBe("my_image_.png");
      expect(anchor.href).toBe("blob:test-image");
      expect(appendChild).toHaveBeenCalledWith(anchor);
      expect(click).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(revoke).not.toHaveBeenCalled();

      // Trigger the scheduled cleanup timeout
      const cleanupCallback = setTimeoutSpy.mock.calls[0][0] as () => void;
      cleanupCallback();
      expect(revoke).toHaveBeenCalledWith("blob:test-image");
    });
  });

  describe("14 & 15. Missing browser APIs and failure handling for downloads", () => {
    it("throws when document or URL APIs are missing (e.g. Node/SSR)", () => {
      vi.stubGlobal("document", undefined);
      expect(() => downloadBlob(new Blob(["data"]), "file.png")).toThrow(
        /only available in a browser/i,
      );
    });

    it("throws when document.body is missing", () => {
      vi.stubGlobal("document", { body: null, createElement: vi.fn() });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:temp");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      expect(() => downloadBlob(new Blob(["data"]), "file.png")).toThrow(
        /document body is not available/i,
      );
    });

    it("rejects invalid blob inputs", () => {
      vi.stubGlobal("document", { body: {} });
      expect(() => downloadBlob(null as unknown as Blob, "file.png")).toThrow(TypeError);
      expect(() => downloadBlob({} as unknown as Blob, "file.png")).toThrow(TypeError);
    });

    it("revokes object URL immediately and throws if document.createElement fails", () => {
      vi.stubGlobal("document", {
        body: {},
        createElement: () => {
          throw new Error("createElement failed");
        },
      });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:create-fail");
      const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      expect(() => downloadBlob(new Blob(["x"]), "x.png")).toThrow("createElement failed");
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith("blob:create-fail");
    });

    it("removes anchor, revokes object URL immediately, and throws without duplicate revocation if appendChild fails", () => {
      const remove = vi.fn();
      const anchor = {
        href: "",
        download: "",
        rel: "",
        style: { display: "" },
        click: vi.fn(),
        remove,
      };
      vi.stubGlobal("document", {
        body: {
          appendChild: () => {
            throw new Error("appendChild failed");
          },
        },
        createElement: vi.fn().mockReturnValue(anchor),
      });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:append-fail");
      const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      expect(() => downloadBlob(new Blob(["x"]), "x.png")).toThrow("appendChild failed");
      expect(remove).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith("blob:append-fail");
    });

    it("revokes the object URL immediately if clicking the link throws without duplicate revocation", () => {
      const remove = vi.fn();
      const anchor = {
        href: "",
        download: "",
        rel: "",
        style: { display: "" },
        click: vi.fn(() => {
          throw new Error("Blocked by popup blocker");
        }),
        remove,
      };
      vi.stubGlobal("document", {
        body: { appendChild: vi.fn() },
        createElement: vi.fn().mockReturnValue(anchor),
      });
      vi.stubGlobal("setTimeout", vi.fn());
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:failed");
      const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      expect(() => downloadBlob(new Blob(["x"]), "x.png")).toThrow(
        "Blocked by popup blocker",
      );
      expect(remove).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith("blob:failed");
    });

    it("removes anchor, revokes object URL immediately, and throws without duplicate revocation if setTimeout scheduling fails", () => {
      const remove = vi.fn();
      const anchor = {
        href: "",
        download: "",
        rel: "",
        style: { display: "" },
        click: vi.fn(),
        remove,
      };
      vi.stubGlobal("document", {
        body: { appendChild: vi.fn() },
        createElement: vi.fn().mockReturnValue(anchor),
      });
      vi.stubGlobal("setTimeout", () => {
        throw new Error("Timer scheduling failed");
      });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:timer-fail");
      const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

      expect(() => downloadBlob(new Blob(["x"]), "x.png")).toThrow("Timer scheduling failed");
      expect(remove).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith("blob:timer-fail");
    });

    it("rejects invalid revokeAfterMs options", () => {
      vi.stubGlobal("document", { body: {} });
      expect(() =>
        downloadBlob(new Blob(["data"]), "file.png", { revokeAfterMs: -100 }),
      ).toThrow(RangeError);
      expect(() =>
        downloadBlob(new Blob(["data"]), "file.png", { revokeAfterMs: Infinity }),
      ).toThrow(RangeError);
    });
  });
});
