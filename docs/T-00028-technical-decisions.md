# T-00028 — Technical Research, Architecture Decisions & Image Helpers

## 1. Overview & Scope

Task **T-00028** establishes the core foundation for Marvedge Tools client-side image processing and document manipulation:

1. **Audit Template for Four Reference Tools**: Image Compressor, Image Resizer and Cropper, Image Format Converter, and PDF Merger and Splitter. (Note: Reference values depend on the deployed website and Coda Tools Description PDF and are kept strictly marked as `Pending` to avoid inventing assumptions).
2. **Library Research & Comparison**: Evaluating Native Canvas, `createImageBitmap()`, `browser-image-compression`, `Compressor.js`, `Pica`, and `pdf-lib`.
3. **Shared Image Helpers**: Production-grade client-side utilities for decoding with format sniffing, orientation correction without double-rotation, canvas export with transparency flattening, and safe downloads.
4. **Automated Unit Testing & Manual Browser Test Plan**: 67 unit tests verifying shared helper contracts, input validation, resource cleanup, and mock handling, alongside an explicit manual test plan for real physical fixtures in real browser engines.
5. **Part 2 — Image Compressor**: Full batch image compression supporting WebP, JPG, and PNG with visual before-and-after comparison, duplicate filename disambiguation, fault-tolerant batching, individual and ZIP archive downloads, and 21 dedicated unit tests.

---

## 2. Shared Pipeline Architecture

The shared image processing architecture uses a modular, decoupled pipeline where each stage performs a single responsibility and guarantees resource cleanup:

```
+-----------------------------------------------------------------------------------------+
|                                    Input File / Blob                                    |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
                      +---------------------------------------------+
                      |         decodeImage(file, options)          |
                      |  1. Validate input size & options           |
                      |  2. Read first 256 KB header bytes          |
                      |  3. Sniff magic bytes (JPEG/PNG/WebP/BMP/..) |
                      |  4. Verify against declared MIME & aliases  |
                      |  5. Fast header dimension pre-check         |
                      |  6. createImageBitmap(from-image)           |
                      |  7. Post-decode bounds check & leak guard   |
                      +---------------------------------------------+
                                             |
                                             v Returns ImageBitmap
                      +---------------------------------------------+
                      |      correctImageOrientation(bitmap)        |
                      |  1. Materializes visual pixels into Canvas  |
                      |  2. Strips EXIF metadata to prevent double- |
                      |     rotation in downstream tools            |
                      |  3. Preserves portrait/landscape dimensions |
                      +---------------------------------------------+
                                             |
                                             v Returns HTMLCanvasElement
                      +---------------------------------------------+
                      |             Downstream Feature              |
                      |  (Crop, Resize, Compress, Convert, Filters) |
                      +---------------------------------------------+
                                             |
                                             v Returns HTMLCanvasElement
                      +---------------------------------------------+
                      |       canvasToBlob(canvas, options)         |
                      |  1. Validate dimensions, type, quality      |
                      |  2. Composite background for JPEG alpha     |
                      |  3. Call canvas.toBlob()                    |
                      |  4. Catch silent browser fallback to PNG    |
                      +---------------------------------------------+
                                             |
                                             v Returns Blob
                      +---------------------------------------------+
                      |       downloadBlob(blob, filename, opts)    |
                      |  1. Sanitize control chars, slashes, device |
                      |     names (CON, PRN, AUX, NUL, COM/LPT)     |
                      |  2. Preserve extension on length truncation |
                      |  3. Create object URL & trigger anchor click|
                      |  4. Safely schedule revocation / cleanup    |
                      +---------------------------------------------+
```

---

## 3. Comprehensive Library Research & Evaluation

### A. Image Manipulation Primitives

| Criterion | Native Canvas 2D API | `createImageBitmap()` |
|---|---|---|
| **Role** | Raster drawing, cropping, scaling, compositing, pixel export | Asynchronous image decoding from Blobs/Images |
| **Browser Compatibility** | Universal (all modern and legacy browsers) | Chrome 50+, Firefox 42+, Safari 15+, Edge 79+ |
| **Bundle Size** | 0 KB (Native browser standard) | 0 KB (Native browser standard) |
| **Execution Threading & Workers** | Supported on the main thread and in Web Workers via `OffscreenCanvas` (Chrome 69+, Safari 16.4+, Firefox 105+) | Returns a `Promise<ImageBitmap>`. Can be called on the main thread or inside a Dedicated Web Worker. **Important:** Calling `createImageBitmap()` from the main thread does **not** guarantee full off-main-thread execution; browser engines manage internal decode threads differently, and synchronous memory allocation or IPC may still impact the calling thread. |
| **EXIF Orientation** | Does not parse EXIF tags; draws raw pixel buffer | Built-in via `{ imageOrientation: "from-image" }` |
| **Performance** | GPU-accelerated rasterization; synchronous execution on the calling thread | Asynchronous decode Promise; avoids manual DOM image element instantiation |
| **Memory Management** | Canvas allocates width x height x 4 bytes; subject to browser canvas limits | Explicit `.close()` is **mandatory** to free GPU and backing memory |
| **Our Implementation Status** | Used in `correctImageOrientation()` and `canvasToBlob()` | Used in `decodeImage()`. Currently runs on the caller's thread (main thread in client components), **not** inside a dedicated Worker. |
| **Recommendation** | **Adopt**: Native standard for visual transformation and raster export | **Adopt**: Primary decoder primitive in `decodeImage()` |

---

### B. Image Compression Libraries

| Criterion | `browser-image-compression` | `Compressor.js` | `Pica` |
|---|---|---|---|
| **Primary Focus** | Client-side compression targeting file size or max dimensions | Canvas-based image lossy compression | High-quality image downscaling |
| **Browser Support** | All modern browsers (Chrome, Safari, Firefox, Edge) | IE11+, all modern browsers | All modern browsers |
| **Bundle Size** | ~28 KB (min+gz) | ~5 KB (min+gz) | ~12 KB (min+gz) |
| **Web Worker Support** | Built-in Web Worker execution (`useWebWorker: true`) | None (runs on main thread via canvas) | Web Worker and WebAssembly (WASM) / WebGL acceleration |
| **Worker Loading & CSP** | **Requires CSP consideration:** The library instantiates its Web Worker via an in-memory `Blob` URL, requiring `blob:` in `worker-src` (with fallback chain: worker-src -> child-src -> script-src -> default-src). Inside the worker, it imports the library engine via `importScripts()`, which defaults to an external CDN (jsdelivr). The `libURL` option allows pointing this import to a self-hosted script to remove the external CDN dependency, but self-hosting does **not** eliminate the `blob:` worker requirement. | N/A (runs on main thread) | Bundles Web Worker / WASM kernels; requires self-hosting or bundler worker-loader configuration if strict CSP applies. |
| **EXIF Handling** | Handles orientation during compression | Reads EXIF orientation via built-in parser | None (pure resizer) |
| **Resizing & Filter Mechanics** | Standard canvas scaling | Standard canvas scaling | Implements Lanczos-2 and Lanczos-3 windowed sinc filters. Includes an optional unsharp mask filter (`unsharpAmount`, `unsharpRadius`, `unsharpThreshold`) to restore perceived edge sharpness after downscaling. |
| **Gamma Correction & Artifacts** | Standard canvas sRGB handling | Standard canvas sRGB handling | **Explicit limitation:** Pica's official documentation states that it does **not** perform gamma correction due to performance reasons. Furthermore, while its Lanczos filters reduce aliasing compared to basic bilinear downscaling, it does **not** eliminate all moiré or aliasing artifacts on high-frequency patterns. |
| **API Style** | Modern Promise-based, `AbortSignal`, progress callback | Callback-based (`new Compressor(file, { success, error })`) | Modern Promise-based (`pica.resize(from, to)`) |
| **Recommendation** | **Recommended for Image Compressor tool** | Secondary candidate | **Optional candidate for Image Resizer tool** if high-order Lanczos downscaling is required |

#### Content Security Policy (CSP) & Worker Hosting Considerations for `browser-image-compression`:
When adopting `browser-image-compression` for the Image Compressor tool:
- **Blob Worker Requirement**: The library creates its Web Worker dynamically from a `Blob` URL (`new Worker(URL.createObjectURL(blob))`). As documented by the library, `blob:` is required in the `worker-src` CSP directive (with the standard fallback chain: worker-src -> child-src -> script-src -> default-src).
- **Worker Script Import (`libURL`)**: Inside the dynamically created worker, `importScripts()` is called to load the compression engine. By default, this loads from an external CDN (such as jsDelivr), which requires allowing external script origins in CSP.
- **Self-Hosting Benefits & Limits**: Passing the `libURL` option (e.g., pointing to a self-hosted `/browser-image-compression.js`) allows the script imported by the worker to be served from the application's own origin (`'self'`), eliminating the third-party CDN dependency and external network reliance for offline support.
- **CSP Reality**: Self-hosting removes the external CDN script requirement, but it does **not** eliminate the `worker-src ... blob:` requirement because the worker itself is still spawned from a `Blob` URL. The exact CSP configuration must be tested and verified against the target browser matrix rather than assuming strict `worker-src 'self'` without `blob:`.

---

### C. PDF Processing Libraries

| Criterion | `pdf-lib` | `pdfjs-dist` (Mozilla) | `jspdf` |
|---|---|---|---|
| **Primary Focus** | PDF creation, page copying, merging, splitting, modifying | PDF rendering to canvas / visual viewer | Client-side document generation from scratch |
| **Browser Support** | 100% pure JS; universal browser and Node support | All modern browsers | All modern browsers |
| **Bundle Size** | ~85 KB (min+gz) | >1 MB (min+gz) | ~70 KB (min+gz) |
| **Worker Support** | Can run in Web Workers without DOM dependencies | Uses Web Workers for background rendering | Main thread primarily |
| **Merge / Split API** | Excellent: `PDFDocument.create()`, `copyPages()`, `addPage()`, `save()` | Does not support saving or modifying PDFs | Poor for merging/splitting existing binary PDFs |
| **Preview Capability**| Document manipulation only; does not render visual pages | Renders PDF pages to Canvas for live thumbnails | Minimal rasterization |
| **Encrypted PDFs** | Unencrypted only; rejects password-protected PDFs | Can decrypt with supplied password | Limited |
| **Recommendation** | **Adopt for PDF Merger and Splitter** | Use only if thumbnail rendering is strictly required | Not suitable for merging/splitting |

---

## 4. Helper Function Specifications

All helpers reside in `lib/image/` and are re-exported via `lib/image/index.ts`.

### 1. `decodeImage(file: Blob | File, options?: DecodeImageOptions): Promise<ImageBitmap>`
- **Inputs**:
  - `file`: `Blob` or `File` (duck-typed for cross-frame support).
  - `options.maxFileSizeBytes`: Optional file size cap in bytes.
  - `options.maxPixelCount`: Optional decoded pixel cap (`width * height`).
- **Outputs**: Resolved `ImageBitmap` oriented visually.
- **Execution Threading**: Runs on the calling thread. Does not instantiate a Web Worker.
- **Error Handling**:
  - Throws `TypeError` if input is not a valid Blob.
  - Throws `Error("The selected image is empty.")` if `size === 0`.
  - Throws `Error("The selected image exceeds the allowed file size.")` before reading.
  - Throws `Error("Unsupported or invalid image content...")` if magic bytes do not match JPEG, PNG, WebP, AVIF, or BMP.
  - Throws `Error("The file content does not match its declared image format.")` on MIME spoofing (respects valid aliases like `image/jpg` for JPEG or `image/x-png` for PNG).
  - Throws `Error("The decoded image exceeds the allowed pixel count.")` before decode when header allows, and after decode as fallback.
  - Throws `Error("The decoded image has invalid dimensions.")` if dimensions `<= 0`.
  - **Cleanup Guarantee**: If any failure occurs after `createImageBitmap` succeeds, `bitmap.close()` is guaranteed to be called in a catch block before re-throwing.

### 2. `correctImageOrientation(image: ImageBitmap): HTMLCanvasElement`
- **Inputs**: `image`: `ImageBitmap`.
- **Outputs**: `HTMLCanvasElement` containing materialized pixels.
- **Double-Rotation Prevention**: Because `decodeImage` calls `createImageBitmap` with `{ imageOrientation: "from-image" }`, the bitmap has already been rotated by the browser engine. Drawing it at `(0, 0)` onto a canvas transfers the visual pixels and strips the EXIF orientation tag, ensuring downstream compressors or tools do not rotate the image a second time.
- **Error Handling**: Throws `TypeError` if dimensions are invalid or `<= 0`. Throws `Error` if canvas 2D context creation or drawing fails.

### 3. `canvasToBlob(canvas: HTMLCanvasElement, options?: CanvasToBlobOptions): Promise<Blob>`
- **Inputs**:
  - `canvas`: `HTMLCanvasElement` with valid non-zero dimensions.
  - `options.type`: `"image/png" | "image/jpeg" | "image/webp"` (defaults to `"image/png"`).
  - `options.quality`: Number between 0 and 1 (for JPEG and WebP).
  - `options.backgroundColor`: Background color for transparency flattening (defaults to `"#ffffff"` for JPEG to avoid black transparent areas).
- **Outputs**: Promise resolving to an exported `Blob`.
- **Error Handling**:
  - Throws `TypeError` on invalid canvas or unsupported target MIME type.
  - Throws `RangeError` on invalid quality argument.
  - **Unflattened JPEG Guard**: If background compositing fails (e.g. `getContext("2d")` returns `null` or canvas drawing fails), `compositeOnBackground` throws a descriptive error and `canvasToBlob` rejects immediately. Compositing is never silently skipped, guaranteeing that an unflattened transparent canvas is never exported to JPEG upon compositing failure.
  - Detects silent browser encoder fallback: if the browser exports `image/png` when `image/webp` was requested, rejects with `"This browser does not support exporting..."`.
  - Catches `SecurityError` on tainted canvases and provides clear remediation instructions.

### 4. `downloadBlob(blob: Blob, filename: string, options?: DownloadBlobOptions): void`
- **Inputs**:
  - `blob`: `Blob` to download.
  - `filename`: Desired filename string.
  - `options.revokeAfterMs`: URL revocation delay (defaults to 30,000 ms).
- **Filename Sanitization (`sanitizeDownloadFilename`)**:
  - Replaces path separators (`/`, `\`), control characters, and reserved symbols (`:*?"<>|`) with `_`.
  - Normalizes Unicode NFC, collapses whitespace, trims trailing spaces and dots.
  - Strips Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-COM9`, `LPT1-LPT9`) even when followed by extensions.
  - Truncates names exceeding 180 characters while **preserving the file extension**.
  - Falls back to `"download"` if filename becomes empty.
- **Robust URL Revocation & Anchor Cleanup**:
  - Creates object URL via `URL.createObjectURL(blob)` with guaranteed lifecycle management.
  - Encapsulates URL revocation with single-invocation protection (`isRevoked` flag) to prevent duplicate revocation calls.
  - If anchor creation, property assignment, DOM append, click, or timer scheduling fails, the object URL is revoked immediately.
  - If download initiation succeeds, revocation is scheduled after `revokeAfterMs` to allow browser download stream setup.
  - Temporary anchor removal is guaranteed in a `finally` block across both success and all failure paths.

---

## 5. Testing Reality: Mocked Unit Tests vs. Real Browser Testing

To ensure absolute engineering clarity, automated unit tests and browser integration tests are strictly separated:

### What the 67 Mocked Unit Tests (`tests/image-helpers.test.ts`) PROVE:
1. **API Contracts**: All helpers adhere strictly to their TypeScript parameter contracts and return types.
2. **Input Validation**: Empty files (0 bytes), invalid non-Blob inputs, negative dimensions, and non-positive options correctly throw descriptive errors.
3. **Format Sniffing**: Accurate detection of magic bytes for PNG, JPEG, WebP, AVIF, and BMP, and explicit rejection of active/animated formats (SVG, GIF, PDF, plain text).
4. **MIME Spoofing Logic**: Correctly rejects mismatched types (e.g. PNG declared as `image/jpeg`) while allowing legitimate aliases (e.g. `image/jpg` for JPEG, `image/x-png` for PNG).
5. **Header Parsing Algorithms**: Correctly extracts dimensions from synthetic PNG IHDR, JPEG SOF0, WebP VP8X, and BMP DIB byte buffers before calling decoders.
6. **Resource Cleanup Guarantees**: `bitmap.close()` is verified to be called whenever post-decode limits are breached or dimensions are invalid.
7. **Canvas Export Logic**: Correctly composites white background for JPEG, respects custom background colors, rejects when 2D context or drawing fails without exporting unflattened canvas, catches silent fallback to PNG, and catches tainted-canvas errors.
8. **Filename Sanitization & URL Cleanup**: Path traversal prevention, Windows reserved device name handling, extension preservation on truncation, immediate revocation on anchor creation/append/click/timer failure, anchor removal across all failure paths, delayed revocation on success, and prevention of duplicate revocation.

### What the 65 Mocked Unit Tests DO NOT PROVE:
1. **Real Browser Decoder Compatibility**: Vitest runs in a Node environment with `createImageBitmap` and `HTMLCanvasElement` stubbed. It does not run actual browser decoding engines (Blink, Gecko, WebKit).
2. **Real EXIF Orientation Handling**: The unit tests verify that `imageOrientation: "from-image"` is requested and that oriented dimensions match on canvas, but **they do not prove that real physical JPEGs with EXIF orientations 1–8 will render correctly across target browsers**.
3. **Real Device Memory Limits**: They do not test physical GPU rasterization, browser tab crashes, or device canvas limits (such as the ~16.7 megapixel or 4096x4096 canvas ceiling in iOS Safari).
4. **Actual OS File Downloads**: They verify anchor element attribute assignment and click invocation, but not the physical browser download manager or filesystem write.

> [!IMPORTANT]
> Real physical JPEG fixtures with EXIF orientations 1 through 8 (from real phone cameras) and manual browser testing across Chrome, Firefox, Safari, and Edge remain mandatory before certifying complete browser compatibility. See [docs/T-00028-manual-test-plan.md](file:///c:/Users/Lenovo/OneDrive/Documents/3rd year/marvedge-tools/docs/T-00028-manual-test-plan.md).

---

## 6. Usage Guide for Future Tool Implementations

### Example: Image Compressor Tool
```ts
import {
  decodeImage,
  correctImageOrientation,
  canvasToBlob,
  downloadBlob,
} from "@/lib/image";

async function handleCompressImage(file: File) {
  // 1. Decode with optional security/resource limits (runs on caller's thread)
  const bitmap = await decodeImage(file, {
    maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
    maxPixelCount: 100_000_000,         // 100 Megapixels
  });

  try {
    // 2. Materialize oriented pixels onto canvas without double rotation
    const orientedCanvas = correctImageOrientation(bitmap);

    // 3. Export with target quality and transparency flattening
    const compressedBlob = await canvasToBlob(orientedCanvas, {
      type: "image/jpeg",
      quality: 0.75,
      backgroundColor: "#ffffff",
    });

    // 4. Safe download
    downloadBlob(compressedBlob, `compressed_${file.name}`);
  } finally {
    // 5. Always clean up the bitmap backing store
    bitmap.close();
  }
}
```

---

## 7. Known Limitations & Constraints

1. **Active and Animated Formats**: SVG is excluded because it is an XML document format with scripting vectors rather than a passive raster image. Animated GIF and APNG are excluded because this pipeline targets still images.
2. **Header Dimension Pre-check Coverage**: Pre-decode dimension scanning covers PNG (IHDR), JPEG (SOF markers), WebP (VP8, VP8L, VP8X), and BMP (DIB). Certain fragmented ISO BMFF AVIF files may not expose `ispe` boxes in the initial 256 KB; in those cases, the pixel limit is checked immediately post-decode.
3. **Mobile Canvas Size Limits**: Mobile browsers (especially iOS WebKit) impose canvas size limits (typically 4096 x 4096 or 16.7 megapixels). Tool UIs must downsample or handle canvas allocation limits when processing extremely large phone panoramas.
4. **Physical Browser Testing**: Automated unit tests use mocked environments and cannot certify real browser EXIF rendering; real physical testing remains required.

---

## 8. Part 2 — Image Compressor Implementation & Architectural Decisions

The Image Compressor (`src/components/tools/ImageTools.tsx` and `src/lib/image/compressImage.ts`) builds directly on top of the shared image helpers (`decodeImage`, `correctImageOrientation`, `canvasToBlob`, `downloadBlob`).

### A. Supported Formats & Transparency Decisions
1. **Input Formats**: Accepts JPEG, PNG, and WebP (as well as AVIF/BMP via `decodeImage`).
2. **Output Formats**: Selectable among WebP (`image/webp`), JPEG (`image/jpeg`), and PNG (`image/png`).
3. **Transparency Handling**:
   - **PNG and WebP**: Alpha channel transparency is preserved natively.
   - **JPEG**: Because JPEG does not support transparency, `canvasToBlob` automatically flattens transparency against an opaque white background (`#ffffff`). The UI displays an explicit informative note alerting users to this behavior.
4. **Lossless PNG Optimizer & Adaptive Filtering**:
   - Rather than relying solely on basic browser `canvas.toBlob("image/png")` which provides no byte reduction and ignores quality parameters, a dedicated lossless PNG encoder and optimizer is integrated (`src/lib/image/pngOptimizer.ts`).
   - **Color Type Reduction**: Analyzes alpha channels via `ctx.getImageData()`. Images that are 100% opaque (`alpha === 255`) are losslessly encoded as 24-bit RGB (PNG Color Type 2), shedding 25% of uncompressed raw pixel data.
   - **Transparency Optimization**: Images containing transparency retain 32-bit RGBA (PNG Color Type 6). Fully transparent pixels (`alpha === 0`) have their RGB channels zeroed to `(0, 0, 0)`, significantly enhancing Deflate run-length matching without altering rendered visual output.
   - **Adaptive Scanline Filtering**: Evaluates standard PNG scanline predictors (None, Sub, Up, Average, Paeth) across three user-selectable optimization levels: `fast`, `default`, and `maximum`.
   - **Standard Deflate**: Employs Web standard `CompressionStream("deflate")` with RFC 1950 zlib wrapping and standard ISO 3309 CRC-32 checksums.
   - **Size Guard**: Automatically compares output against native `canvas.toBlob` and selects whichever is smaller.
   - **Transparent UI Reporting**: When lossless PNG optimization yields no size reduction or conversion from lossy sources increases byte size, the UI transparently reports the exact difference with the note `(Lossless PNG preserves 100% pixel data)`.

### B. Per-Image Batch Settings & Fault Isolation
1. **Per-Image Independent Controls**: Each file card in a batch provides independent output format selection and quality/optimization controls. Individual settings can be adjusted and recompressed without overwriting other images.
2. **Batch Defaults & Synchronization**: A top-level Batch Defaults panel allows users to configure global defaults and click "Apply to all images" to synchronize settings across all files simultaneously.
3. **Fault Isolation**: Multiple files are processed in `compressBatch()`, with each operation protected by per-file error isolation. Corrupted files produce localized error cards while valid files continue compression and archive bundling.
4. **Duplicate Filename Disambiguation**: Numbering follows the standard operating system convention: `photo-compressed.ext`, `photo-compressed (2).ext`, `photo-compressed (3).ext`. Different file extensions are preserved without artificial suffix collisions.

### C. Visual Comparison & Memory Lifecycle
1. **Side-by-Side Comparison**: Each compressed item renders original and compressed thumbnails with dimension displays, byte size metrics, and percentage reduction (`calculateSavings`).
2. **Object URL Management**: All preview object URLs created with `URL.createObjectURL` are tracked in component refs and cleanly revoked via `URL.revokeObjectURL` upon file changes, recompression, or unmount.

### D. ZIP Archiving
1. **Bundling**: Uses project dependency `jszip` to bundle all successfully compressed items into a single ZIP archive (`compressed-images.zip`).
2. **Filename Consistency**: Archive entry names strictly match individually downloaded file names, with unique numbering preventing any file overwrites inside the archive.

### E. Verification & Test Metrics
- **Automated Unit Tests**:
  - `src/lib/image/__tests__/pngOptimizer.test.ts`: 10 unit tests (CRC-32, Color Type 2/6, adaptive filtering, CompressionStream fallback, canvas error handling).
  - `src/lib/image/__tests__/compressImage.test.ts`: 23 unit tests (savings calculation, duplicate numbering, mixed format handling, per-item batch execution, fault isolation, ZIP creation).
  - `src/lib/image/__tests__/image-helpers.test.ts`: 67 unit tests.
- **Repository Vitest Suite**: **150 passing tests across 12 test files** (`pnpm test`).
- **Real Browser Verification (CDP)**: Verified live on Next.js production build (`next start`) with real images and downloaded file inspections:
  - Opaque PNG output confirmed as 24-bit RGB (Color Type 2).
  - Transparent PNG output confirmed as 32-bit RGBA (Color Type 6) with intact transparency.
  - Size increase handling verified with informative note.
  - Duplicate naming confirmed as `photo-compressed.png`, `photo-compressed (2).png`, `photo-compressed (3).png`.
  - Mixed per-image settings and individual recompression verified.
  - Individual downloaded files matched ZIP archive entries 1:1.
  - ZIP downloaded, extracted with JSZip, and verified with valid file headers.
  - Corrupt file isolation verified with localized error badge and valid-only ZIP download.
  - Zero browser console errors / uncaught exceptions.
