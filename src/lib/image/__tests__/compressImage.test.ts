import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import {
  calculateSavings,
  compressBatch,
  compressSingleImage,
  createZipArchive,
  isCompressedItem,
  isCompressionFailure,
  resolveUniqueFilenames,
  type CompressedItem,
  type CompressionFailure,
  type BatchItemInput,
} from "../compressImage";
import * as decodeModule from "../decodeImage";
import * as orientationModule from "../correctImageOrientation";
import * as canvasBlobModule from "../canvasToBlob";
import * as pngOptModule from "../pngOptimizer";

function makeBitmap(width = 100, height = 50) {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
}

function makeCanvas(width = 100, height = 50) {
  return {
    width,
    height,
    getContext: vi.fn(),
    toBlob: vi.fn((cb: BlobCallback, type?: string) => {
      cb(new Blob(["compressed-bytes"], { type: type || "image/webp" }));
    }),
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

describe("compressImage helper functions", () => {
  describe("calculateSavings", () => {
    it("calculates reduction metrics when compressed is smaller", () => {
      const res = calculateSavings(1000, 400);
      expect(res.savedBytes).toBe(600);
      expect(res.percentReduction).toBe(60);
      expect(res.isSmaller).toBe(true);
    });

    it("handles zero savings when compressed equals original", () => {
      const res = calculateSavings(500, 500);
      expect(res.savedBytes).toBe(0);
      expect(res.percentReduction).toBe(0);
      expect(res.isSmaller).toBe(false);
    });

    it("handles negative savings when compressed is larger than original", () => {
      const res = calculateSavings(500, 750);
      expect(res.savedBytes).toBe(0);
      expect(res.percentReduction).toBe(0);
      expect(res.isSmaller).toBe(false);
    });

    it("handles original size of 0 without dividing by zero", () => {
      const res = calculateSavings(0, 100);
      expect(res.savedBytes).toBe(0);
      expect(res.percentReduction).toBe(0);
      expect(res.isSmaller).toBe(false);
    });

    it("rounds percentage reductions correctly", () => {
      const res = calculateSavings(300, 100);
      // 200 / 300 = 66.666... -> rounds to 67%
      expect(res.percentReduction).toBe(67);
      expect(res.savedBytes).toBe(200);
      expect(res.isSmaller).toBe(true);
    });
  });

  describe("resolveUniqueFilenames", () => {
    it("returns identical names if all are already unique", () => {
      const input = ["banner.webp", "avatar.jpg", "icon.png"];
      expect(resolveUniqueFilenames(input)).toEqual(["banner.webp", "avatar.jpg", "icon.png"]);
    });

    it("does not increment suffixes when identical basenames have different extensions", () => {
      const input = ["photo-compressed.webp", "photo-compressed.jpg", "photo-compressed.png"];
      expect(resolveUniqueFilenames(input)).toEqual([
        "photo-compressed.webp",
        "photo-compressed.jpg",
        "photo-compressed.png",
      ]);
    });

    it("disambiguates identical filenames starting with (2), (3), etc.", () => {
      const input = ["photo.webp", "photo.webp", "photo.webp"];
      expect(resolveUniqueFilenames(input)).toEqual([
        "photo.webp",
        "photo (2).webp",
        "photo (3).webp",
      ]);
    });

    it("handles multiple interleaved duplicates with extensions", () => {
      const input = ["hero.jpg", "card.png", "hero.jpg", "card.png", "hero.jpg"];
      expect(resolveUniqueFilenames(input)).toEqual([
        "hero.jpg",
        "card.png",
        "hero (2).jpg",
        "card (2).png",
        "hero (3).jpg",
      ]);
    });

    it("disambiguates filenames without extensions", () => {
      const input = ["README", "README", "README"];
      expect(resolveUniqueFilenames(input)).toEqual(["README", "README (2)", "README (3)"]);
    });
  });

  describe("Type guard functions", () => {
    it("isCompressedItem identifies valid items and rejects failures", () => {
      const validItem: CompressedItem = {
        id: "1",
        name: "test.webp",
        originalName: "test.jpg",
        originalSize: 100,
        compressedSize: 50,
        format: "image/webp",
        blob: new Blob(["test"], { type: "image/webp" }),
        width: 10,
        height: 10,
      };
      const failure: CompressionFailure = {
        id: "2",
        originalName: "fail.jpg",
        originalSize: 100,
        error: "Decode error",
      };

      expect(isCompressedItem(validItem)).toBe(true);
      expect(isCompressedItem(failure)).toBe(false);
    });

    it("isCompressionFailure identifies failures and rejects valid items", () => {
      const validItem: CompressedItem = {
        id: "1",
        name: "test.webp",
        originalName: "test.jpg",
        originalSize: 100,
        compressedSize: 50,
        format: "image/webp",
        blob: new Blob(["test"], { type: "image/webp" }),
        width: 10,
        height: 10,
      };
      const failure: CompressionFailure = {
        id: "2",
        originalName: "fail.jpg",
        originalSize: 100,
        error: "Decode error",
      };

      expect(isCompressionFailure(failure)).toBe(true);
      expect(isCompressionFailure(validItem)).toBe(false);
    });
  });
});

describe("compressSingleImage", () => {
  it("compresses an image to WebP with specified quality and default white background skipped", async () => {
    const bitmap = makeBitmap(200, 100);
    const canvas = makeCanvas(200, 100);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    const canvasToBlobSpy = vi.spyOn(canvasBlobModule, "canvasToBlob").mockResolvedValue(
      new Blob(["webp-compressed"], { type: "image/webp" })
    );

    const testFile = new File([new Uint8Array([1, 2, 3])], "vacation.jpg", {
      type: "image/jpeg",
    });

    const result = await compressSingleImage(
      testFile,
      { format: "image/webp", quality: 0.75 },
      "vacation.jpg",
      "test-id-1"
    );

    expect(result.id).toBe("test-id-1");
    expect(result.name).toBe("vacation-compressed.webp");
    expect(result.originalName).toBe("vacation.jpg");
    expect(result.originalSize).toBe(3);
    expect(result.compressedSize).toBe(15);
    expect(result.format).toBe("image/webp");
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);

    expect(canvasToBlobSpy).toHaveBeenCalledWith(canvas, {
      type: "image/webp",
      quality: 0.75,
      backgroundColor: null,
    });
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("compresses to JPEG with white background flattening for transparency", async () => {
    const bitmap = makeBitmap(150, 75);
    const canvas = makeCanvas(150, 75);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    const canvasToBlobSpy = vi.spyOn(canvasBlobModule, "canvasToBlob").mockResolvedValue(
      new Blob(["jpeg-compressed"], { type: "image/jpeg" })
    );

    const testFile = new File([new Uint8Array([1, 2])], "logo.png", {
      type: "image/png",
    });

    const result = await compressSingleImage(
      testFile,
      { format: "image/jpeg", quality: 0.8 },
      "logo.png"
    );

    expect(result.name).toBe("logo-compressed.jpg");
    expect(result.format).toBe("image/jpeg");
    expect(canvasToBlobSpy).toHaveBeenCalledWith(canvas, {
      type: "image/jpeg",
      quality: 0.8,
      backgroundColor: "#ffffff",
    });
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("compresses to PNG with lossless optimizer and specified pngLevel", async () => {
    const bitmap = makeBitmap(50, 50);
    const canvas = makeCanvas(50, 50);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    const optimizePngSpy = vi.spyOn(pngOptModule, "optimizeCanvasToPng").mockResolvedValue(
      new Blob(["png-optimized-bytes"], { type: "image/png" })
    );

    const testFile = new File([new Uint8Array([9, 8, 7, 6])], "chart.png", {
      type: "image/png",
    });

    const result = await compressSingleImage(
      testFile,
      { format: "image/png", pngLevel: "maximum" },
      "chart.png"
    );

    expect(result.name).toBe("chart-compressed.png");
    expect(result.format).toBe("image/png");
    expect(optimizePngSpy).toHaveBeenCalledWith(canvas, "maximum");
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("always closes ImageBitmap even when canvasToBlob throws an error", async () => {
    const bitmap = makeBitmap(100, 100);
    const canvas = makeCanvas(100, 100);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    vi.spyOn(canvasBlobModule, "canvasToBlob").mockRejectedValue(
      new Error("Canvas export failed")
    );

    const testFile = new File([new Uint8Array([1])], "crash.jpg", { type: "image/jpeg" });

    await expect(compressSingleImage(testFile)).rejects.toThrow("Canvas export failed");
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});

describe("compressBatch", () => {
  it("compresses multiple files in a batch and reports progress", async () => {
    const bitmap = makeBitmap(100, 100);
    const canvas = makeCanvas(100, 100);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    vi.spyOn(canvasBlobModule, "canvasToBlob").mockResolvedValue(
      new Blob(["bytes"], { type: "image/webp" })
    );

    const file1 = new File([new Uint8Array([1, 2])], "photo1.jpg", { type: "image/jpeg" });
    const file2 = new File([new Uint8Array([3, 4])], "photo2.png", { type: "image/png" });

    const progressCalls: Array<{ completed: number; total: number }> = [];
    const results = await compressBatch([file1, file2], { format: "image/webp" }, (done, total) => {
      progressCalls.push({ completed: done, total });
    });

    expect(results).toHaveLength(2);
    expect(isCompressedItem(results[0])).toBe(true);
    expect(isCompressedItem(results[1])).toBe(true);
    expect((results[0] as CompressedItem).name).toBe("photo1-compressed.webp");
    expect((results[1] as CompressedItem).name).toBe("photo2-compressed.webp");

    expect(progressCalls).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
  });

  it("isolates individual file failures without failing the whole batch", async () => {
    const bitmap = makeBitmap(100, 100);
    const canvas = makeCanvas(100, 100);

    vi.spyOn(decodeModule, "decodeImage").mockImplementation(async (file: File | Blob) => {
      if (file instanceof File && file.name === "corrupt.jpg") {
        throw new Error("Invalid image format signature");
      }
      return bitmap;
    });
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    vi.spyOn(canvasBlobModule, "canvasToBlob").mockResolvedValue(
      new Blob(["bytes"], { type: "image/webp" })
    );

    const goodFile = new File([new Uint8Array([1, 2])], "good.jpg", { type: "image/jpeg" });
    const corruptFile = new File([new Uint8Array([0, 0])], "corrupt.jpg", { type: "image/jpeg" });
    const goodFile2 = new File([new Uint8Array([3, 4])], "good2.png", { type: "image/png" });

    const results = await compressBatch([goodFile, corruptFile, goodFile2]);

    expect(results).toHaveLength(3);
    expect(isCompressedItem(results[0])).toBe(true);
    expect(isCompressionFailure(results[1])).toBe(true);
    expect(isCompressedItem(results[2])).toBe(true);

    const failure = results[1] as CompressionFailure;
    expect(failure.originalName).toBe("corrupt.jpg");
    expect(failure.error).toContain("Invalid image format signature");
  });

  it("disambiguates identical output filenames across batch items with (2), (3)", async () => {
    const bitmap = makeBitmap(100, 100);
    const canvas = makeCanvas(100, 100);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    vi.spyOn(canvasBlobModule, "canvasToBlob").mockResolvedValue(
      new Blob(["bytes"], { type: "image/webp" })
    );

    const file1 = new File([new Uint8Array([1])], "product.jpg", { type: "image/jpeg" });
    const file2 = new File([new Uint8Array([2])], "product.jpg", { type: "image/jpeg" });
    const file3 = new File([new Uint8Array([3])], "product.jpg", { type: "image/jpeg" });

    const results = await compressBatch([file1, file2, file3], { format: "image/webp" });

    expect(results).toHaveLength(3);
    expect((results[0] as CompressedItem).name).toBe("product-compressed.webp");
    expect((results[1] as CompressedItem).name).toBe("product-compressed (2).webp");
    expect((results[2] as CompressedItem).name).toBe("product-compressed (3).webp");
  });

  it("supports mixed-format batches with individual per-image options", async () => {
    const bitmap = makeBitmap(100, 100);
    const canvas = makeCanvas(100, 100);

    vi.spyOn(decodeModule, "decodeImage").mockResolvedValue(bitmap);
    vi.spyOn(orientationModule, "correctImageOrientation").mockReturnValue(canvas);
    const canvasBlobSpy = vi.spyOn(canvasBlobModule, "canvasToBlob").mockImplementation(
      async (_c, opts) => new Blob(["bytes"], { type: opts?.type ?? "image/webp" })
    );
    const pngOptSpy = vi.spyOn(pngOptModule, "optimizeCanvasToPng").mockResolvedValue(
      new Blob(["png-bytes"], { type: "image/png" })
    );

    const file1 = new File([new Uint8Array([1])], "hero.jpg", { type: "image/jpeg" });
    const file2 = new File([new Uint8Array([2])], "logo.png", { type: "image/png" });
    const file3 = new File([new Uint8Array([3])], "icon.webp", { type: "image/webp" });

    const batchInputs: BatchItemInput[] = [
      { file: file1, options: { format: "image/webp", quality: 0.85 } },
      { file: file2, options: { format: "image/jpeg", quality: 0.6 } },
      { file: file3, options: { format: "image/png", pngLevel: "maximum" } },
    ];

    const results = await compressBatch(batchInputs);

    expect(results).toHaveLength(3);
    const item1 = results[0] as CompressedItem;
    const item2 = results[1] as CompressedItem;
    const item3 = results[2] as CompressedItem;

    expect(item1.format).toBe("image/webp");
    expect(item1.name).toBe("hero-compressed.webp");
    expect(canvasBlobSpy).toHaveBeenCalledWith(canvas, expect.objectContaining({ type: "image/webp", quality: 0.85 }));

    expect(item2.format).toBe("image/jpeg");
    expect(item2.name).toBe("logo-compressed.jpg");
    expect(canvasBlobSpy).toHaveBeenCalledWith(canvas, expect.objectContaining({ type: "image/jpeg", quality: 0.6, backgroundColor: "#ffffff" }));

    expect(item3.format).toBe("image/png");
    expect(item3.name).toBe("icon-compressed.png");
    expect(pngOptSpy).toHaveBeenCalledWith(canvas, "maximum");
  });
});

describe("createZipArchive", () => {
  it("throws an error if items array is empty", async () => {
    await expect(createZipArchive([])).rejects.toThrow("No compressed files to archive.");
  });

  it("creates a ZIP archive containing all compressed items and reports progress", async () => {
    const blob1 = new Blob(["content-1"], { type: "image/webp" });
    const blob2 = new Blob(["content-2"], { type: "image/webp" });

    const items: CompressedItem[] = [
      {
        id: "1",
        name: "image1.webp",
        originalName: "image1.jpg",
        originalSize: 100,
        compressedSize: 50,
        format: "image/webp",
        blob: blob1,
        width: 100,
        height: 100,
      },
      {
        id: "2",
        name: "image2.webp",
        originalName: "image2.jpg",
        originalSize: 200,
        compressedSize: 80,
        format: "image/webp",
        blob: blob2,
        width: 200,
        height: 200,
      },
    ];

    let progressTriggered = false;
    const zipBlob = await createZipArchive(items, (pct) => {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
      progressTriggered = true;
    });

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
    expect(progressTriggered).toBe(true);

    // Verify ZIP content by loading it back with JSZip
    const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    expect(loadedZip.file("image1.webp")).not.toBeNull();
    expect(loadedZip.file("image2.webp")).not.toBeNull();

    const text1 = await loadedZip.file("image1.webp")!.async("text");
    const text2 = await loadedZip.file("image2.webp")!.async("text");
    expect(text1).toBe("content-1");
    expect(text2).toBe("content-2");
  });

  it("disambiguates duplicate names within the ZIP archive to prevent file overwrites", async () => {
    const blob1 = new Blob(["file-alpha"], { type: "image/webp" });
    const blob2 = new Blob(["file-beta"], { type: "image/webp" });

    const items: CompressedItem[] = [
      {
        id: "1",
        name: "duplicate.webp",
        originalName: "duplicate.jpg",
        originalSize: 100,
        compressedSize: 50,
        format: "image/webp",
        blob: blob1,
        width: 100,
        height: 100,
      },
      {
        id: "2",
        name: "duplicate.webp",
        originalName: "duplicate.jpg",
        originalSize: 100,
        compressedSize: 50,
        format: "image/webp",
        blob: blob2,
        width: 100,
        height: 100,
      },
    ];

    const zipBlob = await createZipArchive(items);
    const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

    expect(loadedZip.file("duplicate.webp")).not.toBeNull();
    expect(loadedZip.file("duplicate (2).webp")).not.toBeNull();

    const text1 = await loadedZip.file("duplicate.webp")!.async("text");
    const text2 = await loadedZip.file("duplicate (2).webp")!.async("text");
    expect(text1).toBe("file-alpha");
    expect(text2).toBe("file-beta");
  });
});
