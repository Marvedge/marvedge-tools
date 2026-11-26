/**
 * Supported still-image formats for the shared browser image pipeline.
 * Animated GIF and SVG are deliberately excluded: this pipeline produces a
 * single raster frame, and SVG is an active document format rather than a
 * passive raster image.
 */
export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/bmp",
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

/** Common browser/OS aliases for the supported MIME types. */
const MIME_ALIASES: Record<SupportedImageMimeType, readonly string[]> = {
  "image/jpeg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  "image/png": ["image/png", "image/x-png"],
  "image/webp": ["image/webp"],
  "image/avif": ["image/avif"],
  "image/bmp": ["image/bmp", "image/x-bmp", "image/x-ms-bmp"],
};

export interface DecodeImageOptions {
  /** Optional feature-specific upload limit in bytes. No global product limit is assumed. */
  maxFileSizeBytes?: number;
  /** Optional decoded-pixel limit. Header dimensions are checked before decode when available. */
  maxPixelCount?: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const HEADER_SCAN_BYTES = 256 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

/** Detect the actual file format from its header magic bytes instead of trusting file.type. */
export function detectImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "image/bmp";

  // ISO Base Media File Format: AVIF uses an ftyp box with avif/avis as its
  // major or compatible brand. Other HEIF brands are intentionally not accepted.
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = [ascii(bytes, 8, 4)];
    for (let offset = 16; offset + 4 <= Math.min(bytes.length, 64); offset += 4) {
      brands.push(ascii(bytes, offset, 4));
    }
    if (brands.some((brand) => brand === "avif" || brand === "avis")) {
      return "image/avif";
    }
  }

  return null;
}

function validDimensions(width: number, height: number): ImageDimensions | null {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { width, height };
}

/**
 * Read common raster dimensions from headers. This allows maxPixelCount to
 * reject common oversized files before decoding. AVIF and unusual JPEG layouts
 * may not expose dimensions in the scanned prefix; those are checked again
 * after browser decoding.
 */
export function readImageDimensions(
  bytes: Uint8Array,
  mimeType: SupportedImageMimeType,
): ImageDimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (mimeType === "image/png" && bytes.length >= 24) {
    return validDimensions(view.getUint32(16, false), view.getUint32(20, false));
  }

  if (mimeType === "image/bmp" && bytes.length >= 26) {
    const width = view.getInt32(18, true);
    const height = Math.abs(view.getInt32(22, true));
    return validDimensions(width, height);
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;

      // Standalone markers have no length field.
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }
      if (offset + 2 > bytes.length) break;

      const segmentLength = view.getUint16(offset, false);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

      if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 7) {
        const height = view.getUint16(offset + 3, false);
        const width = view.getUint16(offset + 5, false);
        return validDimensions(width, height);
      }
      offset += segmentLength;
    }
  }

  if (mimeType === "image/webp" && bytes.length >= 30) {
    const chunkType = ascii(bytes, 12, 4);
    if (chunkType === "VP8X") {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return validDimensions(width, height);
    }
    if (chunkType === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) {
      const width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
      const height = 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
      return validDimensions(width, height);
    }
    if (
      chunkType === "VP8 " &&
      bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a
    ) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return validDimensions(width, height);
    }
  }

  if (mimeType === "image/avif") {
    // `ispe` is a FullBox: 4 bytes version/flags, then width and height.
    for (let offset = 4; offset + 16 <= bytes.length; offset += 1) {
      if (ascii(bytes, offset, 4) === "ispe") {
        return validDimensions(view.getUint32(offset + 8, false), view.getUint32(offset + 12, false));
      }
    }
  }

  return null;
}

function validateOptions(options: DecodeImageOptions): void {
  if (
    options.maxFileSizeBytes !== undefined &&
    (!Number.isSafeInteger(options.maxFileSizeBytes) || options.maxFileSizeBytes <= 0)
  ) {
    throw new RangeError("maxFileSizeBytes must be a positive safe integer.");
  }

  if (
    options.maxPixelCount !== undefined &&
    (!Number.isSafeInteger(options.maxPixelCount) || options.maxPixelCount <= 0)
  ) {
    throw new RangeError("maxPixelCount must be a positive safe integer.");
  }
}

/** Check whether a declared MIME type matches or is a recognized alias for the detected MIME type. */
function isMimeTypeCompatible(declaredMimeType: string, detectedMimeType: SupportedImageMimeType): boolean {
  const normalized = declaredMimeType.trim().toLowerCase();
  const allowed = MIME_ALIASES[detectedMimeType];
  return allowed.includes(normalized);
}

/**
 * Decode a user-selected raster image into an ImageBitmap.
 *
 * The file signature is checked rather than trusting the browser-provided MIME
 * type. EXIF orientation is applied by the browser during decoding. Callers
 * must call bitmap.close() in a finally block when they have finished using it.
 *
 * Execution thread note: This function runs on the caller's execution thread
 * (the main UI thread when called directly from a React component). While
 * createImageBitmap() returns a Promise and can also be used inside a Web Worker,
 * this helper does not spawn a Worker on its own.
 */
export async function decodeImage(
  file: Blob | File,
  options: DecodeImageOptions = {},
): Promise<ImageBitmap> {
  validateOptions(options);

  if (typeof createImageBitmap !== "function") {
    throw new Error("This environment does not support createImageBitmap().");
  }

  // Duck typing also works for File/Blob objects created in another window or context.
  if (
    !file ||
    typeof file.size !== "number" ||
    typeof file.slice !== "function" ||
    typeof file.arrayBuffer !== "function"
  ) {
    throw new TypeError("Please provide a valid image file.");
  }

  if (file.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  if (options.maxFileSizeBytes !== undefined && file.size > options.maxFileSizeBytes) {
    throw new Error("The selected image exceeds the allowed file size.");
  }

  let headerBytes: Uint8Array;
  try {
    headerBytes = new Uint8Array(await file.slice(0, HEADER_SCAN_BYTES).arrayBuffer());
  } catch {
    throw new Error("The selected image could not be read.");
  }

  const mimeType = detectImageMimeType(headerBytes);
  if (!mimeType) {
    throw new Error("Unsupported or invalid image content. Use JPEG, PNG, WebP, AVIF or BMP.");
  }

  const declaredMimeType = (file.type || "").trim().toLowerCase();
  if (
    declaredMimeType.startsWith("image/") &&
    !isMimeTypeCompatible(declaredMimeType, mimeType)
  ) {
    throw new Error("The file content does not match its declared image format.");
  }

  if (options.maxPixelCount !== undefined) {
    const dimensions = readImageDimensions(headerBytes, mimeType);
    if (dimensions && dimensions.width * dimensions.height > options.maxPixelCount) {
      throw new Error("The decoded image exceeds the allowed pixel count.");
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Fallback: older browser engines might reject the imageOrientation option
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error("The selected file could not be decoded as an image.");
    }
  }

  try {
    if (bitmap.width <= 0 || bitmap.height <= 0) {
      throw new Error("The decoded image has invalid dimensions.");
    }

    const pixelCount = bitmap.width * bitmap.height;
    if (
      !Number.isSafeInteger(pixelCount) ||
      (options.maxPixelCount !== undefined && pixelCount > options.maxPixelCount)
    ) {
      throw new Error("The decoded image exceeds the allowed pixel count.");
    }

    return bitmap;
  } catch (err) {
    bitmap.close();
    throw err;
  }
}
