import JSZip from "jszip";
import { decodeImage } from "./decodeImage";
import { correctImageOrientation } from "./correctImageOrientation";
import { canvasToBlob, type SupportedCanvasOutputType } from "./canvasToBlob";
import { optimizeCanvasToPng, type PngOptimizationLevel } from "./pngOptimizer";
import { extFor, baseName } from "@/components/tools/ui";

export type CompressionFormat = "image/webp" | "image/jpeg" | "image/png";
export type { PngOptimizationLevel };

export interface CompressionOptions {
  quality?: number; // 0.10 to 0.95 (default 0.70) for JPEG and WebP
  format?: CompressionFormat; // default "image/webp"
  pngLevel?: PngOptimizationLevel; // default "default" for PNG lossless optimization
}

export interface BatchItemInput {
  file: File;
  id?: string;
  originalFilename?: string;
  options?: CompressionOptions;
}

export interface CompressedItem {
  id: string;
  name: string;
  originalName: string;
  originalSize: number;
  compressedSize: number;
  format: CompressionFormat;
  blob: Blob;
  width: number;
  height: number;
  error?: null;
}

export interface CompressionFailure {
  id: string;
  originalName: string;
  originalSize: number;
  error: string;
  blob?: null;
}

export type CompressionResult = CompressedItem | CompressionFailure;

export function isCompressedItem(result: CompressionResult): result is CompressedItem {
  return result.blob !== null && result.blob !== undefined && !result.error;
}

export function isCompressionFailure(result: CompressionResult): result is CompressionFailure {
  return typeof result.error === "string";
}

/**
 * Calculates reduction metrics between original byte count and compressed byte count.
 */
export function calculateSavings(originalSize: number, compressedSize: number): {
  savedBytes: number;
  percentReduction: number;
  isSmaller: boolean;
} {
  const diff = originalSize - compressedSize;
  const isSmaller = diff > 0;
  const savedBytes = Math.max(0, diff);
  const percentReduction = originalSize > 0
    ? Math.round((savedBytes / originalSize) * 100)
    : 0;
  return { savedBytes, percentReduction, isSmaller };
}

/**
 * Disambiguates duplicate filenames by appending " (2)", " (3)", etc. before the extension.
 * The first occurrence remains unnumbered (e.g. photo-compressed.jpg).
 * Subsequent occurrences receive sequential numbers starting at 2 (e.g. photo-compressed (2).jpg).
 */
export function resolveUniqueFilenames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const lastDot = name.lastIndexOf(".");
    const stem = lastDot === -1 ? name : name.slice(0, lastDot);
    const ext = lastDot === -1 ? "" : name.slice(lastDot);

    const existingCount = counts.get(name) ?? 0;
    counts.set(name, existingCount + 1);

    if (existingCount === 0) {
      return name;
    }
    return `${stem} (${existingCount + 1})${ext}`;
  });
}

/**
 * Compresses a single image file or blob using shared image helpers.
 */
export async function compressSingleImage(
  file: File | Blob,
  options: CompressionOptions = {},
  originalFilename?: string,
  itemId?: string
): Promise<CompressedItem> {
  const format: CompressionFormat = options.format ?? "image/webp";
  const quality = options.quality ?? 0.7;
  const rawName = originalFilename ?? (file && "name" in file ? (file as File).name : "image");
  const id = itemId ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const bitmap = await decodeImage(file);
  try {
    const orientedCanvas = correctImageOrientation(bitmap);
    const width = orientedCanvas.width;
    const height = orientedCanvas.height;

    // PNG uses lossless optimization with adaptive scanline filtering.
    // JPEG requires white background flattening for transparent pixels.
    // WebP uses lossy compression with native transparency support.
    let blob: Blob;
    if (format === "image/png") {
      blob = await optimizeCanvasToPng(orientedCanvas, options.pngLevel ?? "default");
    } else {
      blob = await canvasToBlob(orientedCanvas, {
        type: format as SupportedCanvasOutputType,
        quality: quality,
        backgroundColor: format === "image/jpeg" ? "#ffffff" : null,
      });
    }

    const extension = extFor(format);
    const name = `${baseName(rawName)}-compressed.${extension}`;

    return {
      id,
      name,
      originalName: rawName,
      originalSize: file.size,
      compressedSize: blob.size,
      format,
      blob,
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}

/**
 * Compresses a batch of image files independently.
 * Supports per-image options via BatchItemInput or uniform default options.
 * Individual failures (corrupt file, invalid signature) are captured gracefully without stopping the batch.
 * Duplicate output filenames are disambiguated safely (e.g. photo-compressed.jpg, photo-compressed (2).jpg).
 */
export async function compressBatch(
  files: Array<File | BatchItemInput>,
  defaultOptions: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  let completed = 0;

  for (let i = 0; i < files.length; i++) {
    const entry = files[i];
    const isInputObj = "file" in entry && Boolean((entry as BatchItemInput).file);
    const file = isInputObj ? entry.file : (entry as File);
    const itemOpts = isInputObj ? { ...defaultOptions, ...entry.options } : defaultOptions;
    const originalName = isInputObj && entry.originalFilename ? entry.originalFilename : file.name;
    const id = isInputObj && entry.id ? entry.id : `item-${i}-${Date.now()}`;

    try {
      const item = await compressSingleImage(file, itemOpts, originalName, id);
      results.push(item);
    } catch (err) {
      results.push({
        id,
        originalName,
        originalSize: file.size,
        error: err instanceof Error ? err.message : "Failed to compress image.",
      });
    }
    completed++;
    onProgress?.(completed, files.length);
  }

  // Ensure unique filenames for successfully compressed items
  const successItems = results.filter(isCompressedItem);
  if (successItems.length > 1) {
    const originalNames = successItems.map((item) => item.name);
    const uniqueNames = resolveUniqueFilenames(originalNames);
    successItems.forEach((item, idx) => {
      item.name = uniqueNames[idx];
    });
  }

  return results;
}

/**
 * Generates a ZIP archive containing all successfully compressed items using JSZip.
 */
export async function createZipArchive(
  items: CompressedItem[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error("No compressed files to archive.");
  }

  const zip = new JSZip();
  // Ensure names within the zip archive are completely distinct
  const uniqueNames = resolveUniqueFilenames(items.map((it) => it.name));

  items.forEach((item, index) => {
    zip.file(uniqueNames[index], item.blob);
  });

  return await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(metadata.percent)
  );
}
