/**
 * Pure TypeScript browser-compatible lossless PNG optimizer.
 *
 * Implements W3C / ISO/IEC 15948 PNG specification:
 * - 100% lossless preservation of pixel data and alpha transparency.
 * - Alpha channel analysis: encodes 100% opaque images as 24-bit RGB (Color Type 2),
 *   saving 25% uncompressed data losslessly; preserves full 32-bit RGBA (Color Type 6)
 *   when transparent pixels exist.
 * - Adaptive row filtering: evaluates None (0), Sub (1), Up (2), Average (3),
 *   and Paeth (4) predictors per scanline to minimize entropy.
 * - Streaming zlib Deflate compression via native standard CompressionStream("deflate").
 * - Guaranteed fallback to standard canvas toBlob("image/png") if environment lacks
 *   CompressionStream or if native canvas export happens to be smaller.
 */

export type PngOptimizationLevel = "fast" | "default" | "maximum";

// Standard CRC32 lookup table (ISO 3309 / ITU-T V.42)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

export function crc32(buffer: Uint8Array, offset = 0, length = buffer.length): number {
  let c = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

async function deflateBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new Error("CompressionStream is not supported in this environment.");
  }

  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  // Write data and close stream
  writer.write(data as unknown as BufferSource);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.length;
    }
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Encodes raw pixel data from an HTMLCanvasElement into an optimized lossless PNG Blob.
 */
export async function optimizeCanvasToPng(
  canvas: HTMLCanvasElement,
  level: PngOptimizationLevel = "default"
): Promise<Blob> {
  const width = canvas.width;
  const height = canvas.height;

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid canvas dimensions for PNG optimization.");
  }

  // Get native canvas blob as baseline and fallback
  const nativeBlobPromise = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export native canvas PNG blob."));
    }, "image/png");
  });

  // If CompressionStream is not available, return the native canvas blob
  if (typeof CompressionStream === "undefined") {
    return await nativeBlobPromise;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return await nativeBlobPromise;
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    // If canvas is tainted or cannot be read, fall back to native toBlob
    return await nativeBlobPromise;
  }

  const pixels = imageData.data;
  const totalPixels = width * height;

  // 1. Alpha channel inspection: Check if image has any transparency
  let hasAlpha = false;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 255) {
      hasAlpha = true;
      break;
    }
  }

  // Determine color type and bytes per pixel
  // Color Type 2 = RGB (24-bit, 3 bpp) - losslessly saves 25% raw bytes when image is opaque!
  // Color Type 6 = RGBA (32-bit, 4 bpp) - preserves all transparency
  const colorType = hasAlpha ? 6 : 2;
  const bpp = hasAlpha ? 4 : 3;
  const lineSize = width * bpp;

  // Extract raw scanlines in target format
  const rawData = new Uint8Array(totalPixels * bpp);
  if (colorType === 6) {
    // RGBA: Clean fully transparent pixels to (0,0,0,0) to optimize deflate run-length
    for (let p = 0; p < totalPixels; p++) {
      const srcIdx = p * 4;
      const alpha = pixels[srcIdx + 3];
      if (alpha === 0) {
        rawData[srcIdx] = 0;
        rawData[srcIdx + 1] = 0;
        rawData[srcIdx + 2] = 0;
        rawData[srcIdx + 3] = 0;
      } else {
        rawData[srcIdx] = pixels[srcIdx];
        rawData[srcIdx + 1] = pixels[srcIdx + 1];
        rawData[srcIdx + 2] = pixels[srcIdx + 2];
        rawData[srcIdx + 3] = alpha;
      }
    }
  } else {
    // RGB: Discard constant 255 alpha channel losslessly
    let destIdx = 0;
    for (let srcIdx = 0; srcIdx < pixels.length; srcIdx += 4) {
      rawData[destIdx++] = pixels[srcIdx];
      rawData[destIdx++] = pixels[srcIdx + 1];
      rawData[destIdx++] = pixels[srcIdx + 2];
    }
  }

  // 2. Adaptive scanline filtering
  // Output size: height * (1 filter byte + lineSize bytes)
  const filteredData = new Uint8Array(height * (lineSize + 1));
  const candidateFilterTypes = level === "fast" ? [0, 1] : [0, 1, 2, 3, 4];

  // Reusable row buffers for filter evaluation
  const filterCandidates: Uint8Array[] = candidateFilterTypes.map(() => new Uint8Array(lineSize));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    const priorOffset = (y - 1) * lineSize;
    const destOffset = y * (lineSize + 1);

    let bestFilter = 0;
    let minSum = Number.MAX_SAFE_INTEGER;

    for (let cIdx = 0; cIdx < candidateFilterTypes.length; cIdx++) {
      const fType = candidateFilterTypes[cIdx];
      const buf = filterCandidates[cIdx];
      let sum = 0;

      for (let x = 0; x < lineSize; x++) {
        const curr = rawData[rowOffset + x];
        const left = x >= bpp ? rawData[rowOffset + x - bpp] : 0;
        const up = y > 0 ? rawData[priorOffset + x] : 0;
        const upLeft = y > 0 && x >= bpp ? rawData[priorOffset + x - bpp] : 0;

        let filteredByte = 0;
        switch (fType) {
          case 0: // None
            filteredByte = curr;
            break;
          case 1: // Sub
            filteredByte = (curr - left) & 0xff;
            break;
          case 2: // Up
            filteredByte = (curr - up) & 0xff;
            break;
          case 3: // Average
            filteredByte = (curr - Math.floor((left + up) / 2)) & 0xff;
            break;
          case 4: // Paeth
            filteredByte = (curr - paethPredictor(left, up, upLeft)) & 0xff;
            break;
        }

        buf[x] = filteredByte;
        // Treat byte as signed difference to measure entropy
        sum += filteredByte > 127 ? 256 - filteredByte : filteredByte;
      }

      if (sum < minSum) {
        minSum = sum;
        bestFilter = fType;
      }
    }

    // Write chosen filter type byte and filtered row bytes
    filteredData[destOffset] = bestFilter;
    const chosenBufIndex = candidateFilterTypes.indexOf(bestFilter);
    filteredData.set(filterCandidates[chosenBufIndex], destOffset + 1);
  }

  // 3. Compress filtered scanlines using RFC 1950 zlib stream
  let idatPayload: Uint8Array;
  try {
    idatPayload = await deflateBytes(filteredData);
  } catch {
    return await nativeBlobPromise;
  }

  // 4. Assemble compliant PNG file:
  // Signature (8) + IHDR (25) + IDAT (12 + payload) + IEND (12)
  const totalPngSize = 8 + 25 + (12 + idatPayload.length) + 12;
  const pngBytes = new Uint8Array(totalPngSize);
  const view = new DataView(pngBytes.buffer);

  // PNG Signature
  pngBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

  // IHDR chunk: length = 13
  view.setUint32(8, 13, false);
  pngBytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  pngBytes[24] = 8; // 8-bit depth
  pngBytes[25] = colorType; // 2 (RGB) or 6 (RGBA)
  pngBytes[26] = 0; // Deflate
  pngBytes[27] = 0; // Adaptive filtering
  pngBytes[28] = 0; // Non-interlaced
  view.setUint32(29, crc32(pngBytes, 12, 17), false);

  // IDAT chunk
  const idatOffset = 33;
  view.setUint32(idatOffset, idatPayload.length, false);
  pngBytes.set([0x49, 0x44, 0x41, 0x54], idatOffset + 4); // "IDAT"
  pngBytes.set(idatPayload, idatOffset + 8);
  view.setUint32(
    idatOffset + 8 + idatPayload.length,
    crc32(pngBytes, idatOffset + 4, idatPayload.length + 4),
    false
  );

  // IEND chunk
  const iendOffset = idatOffset + 12 + idatPayload.length;
  view.setUint32(iendOffset, 0, false);
  pngBytes.set([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], iendOffset + 4);

  const optimizedBlob = new Blob([pngBytes], { type: "image/png" });
  const nativeBlob = await nativeBlobPromise;

  // Use the smaller blob between our optimized PNG and native canvas export
  return optimizedBlob.size < nativeBlob.size ? optimizedBlob : nativeBlob;
}
