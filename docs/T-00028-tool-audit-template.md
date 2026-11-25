# T-00028 — Four-Tool Repository Code Audit & Reference Matrix

**Audit Date**: 2026-11-26
**Audit Scope**: Codebase implementation (`src/components/tools/ImageTools.tsx`, `src/lib/image/`, `src/lib/fit-size.ts`, `src/lib/tools.ts`), verified via automated unit testing and real Chromium browser testing over Chrome DevTools Protocol.
**Reference Specification Status**: Awaiting deployed reference website URL and the Coda Tools Description PDF. All reference comparison items requiring external documents are explicitly flagged as `[Pending Reference Site / Coda PDF Verification]`.

---

## 1. Master Tool Comparison Matrix

| Audit Dimension | Tool 1: Image Compressor | Tool 2: Image Resizer & Cropper | Tool 3: Image Format Converter | Tool 4: PDF Merger & Splitter |
|---|---|---|---|---|
| **Local Route / Slug** | `/image-compressor` | `/image-resizer` | `/image-format-converter` | `/pdf-merger` |
| **Reference Route** | *[Pending Reference Site]* | *[Pending Reference Site]* | *[Pending Reference Site]* | *[Pending Reference Site]* |
| **Accepted Input Formats** | `image/jpeg`, `image/png`, `image/webp` (enforced via file dropzone and `decodeImage` MIME sniffer) | `image/*` (accepts JPEG, PNG, WebP via `decodeImage` sniffer) | `image/*` (accepts JPEG, PNG, WebP via `decodeImage` sniffer) | `application/pdf` |
| **Libraries Used** | Native Canvas 2D, `createImageBitmap`, `@/lib/image` helpers | Native Canvas 2D, `@/lib/fit-size`, `@/lib/image` helpers | Native Canvas 2D, `jszip` (v3.10.2), `@/lib/image` helpers | `pdf-lib` (v1.17.1) |
| **Shared Helpers Integrated** | `decodeImage`, `correctImageOrientation`, `canvasToBlob`, `downloadBlob` | `decodeImage`, `correctImageOrientation`, `canvasToBlob`, `downloadBlob` | `decodeImage`, `correctImageOrientation`, `canvasToBlob`, `downloadBlob` | N/A (Document tool; uses `pdf-lib` and `ui.tsx`) |
| **Processing Architecture** | Client-side (in-browser Canvas and Promise-based ImageBitmap decoding) | Client-side (in-browser Canvas with binary search quality/scale fitting) | Client-side (in-browser Canvas and JSZip in-memory bundling) | Client-side (`pdf-lib` WebAssembly/pure JS document manipulation) |
| **User Controls** | Quality slider (10% to 95%), Output format dropdown (`WebP`, `JPG`), Batch compress trigger | Width (px), Height (px), Lock aspect ratio toggle, Fit selector (`cover`, `contain`, `stretch`), Target file size (KB presets and custom input) | Format selector pills (`PNG`, `JPG`, `WEBP`), Batch convert trigger | Mode toggle (`Merge PDFs`, `Split / extract pages`), Move up/down buttons, Remove file buttons, Page range text input |
| **Preview Capabilities** | Output thumbnail (64x64), original vs compressed byte size, percentage savings indicator | Live centered canvas preview (max-h-96), output byte size, target match status (`Check` / `AlertTriangle`), scale and quality indicators | Output thumbnail (48x48) per converted file, output byte size | Document list with page counts; no visual page content thumbnail rendering |
| **Output Formats** | `image/webp` (`.webp`) or `image/jpeg` (`.jpg`) | `image/jpeg` (`.jpg`) | `image/png` (`.png`), `image/jpeg` (`.jpg`), `image/webp` (`.webp`) | `application/pdf` (`merged.pdf` or `extracted-pages.pdf`) |
| **Batch Capabilities** | Yes (multiple file upload, batch compression in single loop, individual downloads) | Single image processing only | Yes (multiple file upload, batch conversion, individual download buttons and "Download all as ZIP") | Merge: Multiple file upload, sequential merging; Split: Single file upload, page range extraction |
| **Transparency Handling** | WebP: transparency preserved; JPEG: flattened onto `#ffffff` background | Flattened onto `#ffffff` canvas background | PNG/WebP: transparency preserved; JPEG: flattened onto `#ffffff` with user UI notice | N/A |
| **Orientation Handling** | Auto-corrected via `correctImageOrientation` from EXIF tags on `ImageBitmap` | Auto-corrected via `correctImageOrientation`; canvas dimensions initialized to oriented size | Auto-corrected via `correctImageOrientation` from EXIF tags | Retains native page rotation dictionary via `pdf-lib` |
| **Error Handling** | Rejects invalid image types and corrupted signatures with descriptive error; memory freed via `bitmap.close()` | Rejects invalid image signatures; rejects invalid backgroundColor values; memory freed in `finally` | Rejects unsupported types; safely cleans up object URLs on download failure | Displays inline alert note if file fails `PDFDocument.load` or invalid page range syntax is provided |
| **Download Behavior** | Safe single download via `downloadBlob` (sanitizes filename, revokes object URL) | Safe single download via `downloadBlob` (`${name}-${w}x${h}.jpg`) | Single download via `downloadBlob`; multi-file ZIP download via `downloadBlob` (`converted-images.zip`) | Single download via `download()` (`merged.pdf` or `extracted-pages.pdf`) |

---

## 2. Tool 1: Image Compressor Audit

- **Route**: `/image-compressor`
- **Component**: `ImageCompressor` in [src/components/tools/ImageTools.tsx](file:///c:/Users/Lenovo/OneDrive/Documents/3rd%20year/marvedge-tools/src/components/tools/ImageTools.tsx)
- **Primary Goal**: Compress raster images to reduce file size while allowing quality selection.

### Existing Functionality Verified
- Accepts JPEG, PNG, and WebP via drag-and-drop or file picker.
- Bundles quick sample loader (`loadSample("photo")`).
- Quality slider ranges from 10% to 95% (default 70%).
- Output format selector supports WebP and JPEG.
- Displays savings summary (`Saved X KB across Y images`) and per-file cards with before/after byte count and reduction percentage.
- Real browser test: 101.2 KB JPEG compressed to 45.9 KB WebP (55% smaller) at 70% quality, and 76.1 KB JPEG (25% smaller) at 50% quality.

### Shared Helpers Integrated
- `decodeImage(f)`: Validates magic byte signatures, rejects non-image inputs, and decodes via `createImageBitmap`.
- `correctImageOrientation(bitmap)`: Standardizes EXIF orientation to prevent sideways or upside-down mobile photos.
- `canvasToBlob(canvas, { type, quality, backgroundColor })`: Enforces opaque `#ffffff` background for JPEG and preserves alpha channel for WebP.
- `downloadBlob(blob, name)`: Guarantees object URL revocation and filename sanitization.
- `bitmap.close()`: Wrapped in `try...finally` to immediately release GPU/RAM memory.

### Limitations & Missing Functionality
- Does not support AVIF or GIF output.
- Does not currently offload compression to a Web Worker (runs in main browser thread via Promise).
- Lacks a target file size mode (e.g., "compress to under 200 KB"); target sizing is currently implemented in Image Resizer.
- *[Pending Reference Site / Coda PDF Verification]*: Verify whether the reference product specifies a split-pane before/after visual comparison slider or maximum batch size limits.

---

## 3. Tool 2: Image Resizer and Cropper Audit

- **Route**: `/image-resizer`
- **Component**: `ImageResizer` in [src/components/tools/ImageTools.tsx](file:///c:/Users/Lenovo/OneDrive/Documents/3rd%20year/marvedge-tools/src/components/tools/ImageTools.tsx)
- **Primary Goal**: Resize pixel dimensions, crop/fit within framing targets, and iteratively tune quality/scale to meet target file sizes.

### Existing Functionality Verified
- Accepts single image upload or bundled passport portrait sample (`loadSample("portrait")`).
- Reads native dimensions (`768 x 1024` px for portrait sample).
- Provides preset dimensions via `PresetPicker` (e.g., passport, social media dimensions).
- Width and Height numeric inputs with aspect ratio lock toggle.
- Three framing modes: `cover` (crop to fill), `contain` (fit inside with white bars), and `stretch`.
- Target file size optimization: Preset buttons (`≤ 10 KB`, `≤ 20 KB`, `≤ 50 KB`, `≤ 100 KB`, `≤ 200 KB`, `No target`) or custom KB input. Uses binary search in `@/lib/fit-size` to tune quality first, then scale if needed.
- Live preview updates with 250ms debounce and displays match feedback (`under your target` vs `still above your target`).
- Real browser test: Resized 768x1024 image to 400x500; with 20 KB target limit enabled, the optimizer produced a 19.8 KB output at 85% quality without downscaling pixels.

### Shared Helpers Integrated
- `decodeImage(f)`: Safe decoding and signature validation.
- `correctImageOrientation(bitmap)`: Returns an `HTMLCanvasElement` oriented according to EXIF metadata.
- `canvasToBlob(canvas, { type: "image/jpeg", quality, backgroundColor: "#ffffff" })`: Safe export with opaque white background and verified error handling.
- `downloadBlob(blob, filename)`: Safe download trigger (`${name}-${w}x${h}.jpg`).
- Resource cleanup: `bitmap.close()` in `pick()`, URL revocation on component unmount and preview updates.

### Limitations & Missing Functionality
- Export format is hardcoded to JPEG (`image/jpeg`); PNG and WebP exports are not selectable in this tool.
- Lacks interactive visual cropping UI (draggable bounding box handles); cropping is algorithmic based on `cover`/`contain`/`stretch`.
- Scaling uses Canvas 2D bilinear interpolation; does not use Lanczos-3 filtering (`pica`).
- *[Pending Reference Site / Coda PDF Verification]*: Verify whether freeform interactive crop overlay, custom background color pickers, or non-JPEG export formats are required by the Coda specification.

---

## 4. Tool 3: Image Format Converter Audit

- **Route**: `/image-format-converter`
- **Component**: `FormatConverter` in [src/components/tools/ImageTools.tsx](file:///c:/Users/Lenovo/OneDrive/Documents/3rd%20year/marvedge-tools/src/components/tools/ImageTools.tsx)
- **Primary Goal**: Convert batches of images between standard raster formats.

### Existing Functionality Verified
- Accepts multiple files or bundled sample pair (photo JPEG + transparent logo PNG).
- Target format pill selector: `PNG`, `JPG`, `WEBP`.
- Contextual warning notice for JPEG: `"JPG has no transparency — transparent areas become white."`
- Batch conversion processes each image and renders individual download cards with thumbnails, filename extensions matching selected format, and byte sizes.
- Provides individual "Save" download buttons and a batch "Download all as ZIP" button using `jszip`.
- Real browser test: Converted sample photo and logo to PNG (1.00 MB / 67.7 KB), JPG (1.00 MB / 67.7 KB with white background), and WebP (99.9 KB / 15.6 KB). Both individual save and ZIP download functioned without console errors.

### Shared Helpers Integrated
- `decodeImage(f)`: Validates each input file in the batch.
- `correctImageOrientation(bitmap)`: Normalizes orientation across heterogeneous inputs.
- `canvasToBlob(orientedCanvas, { type, quality: 0.92, backgroundColor: to === "image/jpeg" ? "#ffffff" : null })`: Preserves transparency for PNG and WebP; guarantees validated white background for JPEG.
- `downloadBlob(blob, name)`: Used for both single file downloads and the compiled ZIP archive.
- `bitmap.close()`: Frees resources per image in the conversion loop.

### Limitations & Missing Functionality
- Limited to PNG, JPEG, and WebP; does not support AVIF, SVG, BMP, or ICO.
- Quality is fixed at 0.92 for lossy conversions; no user-facing quality slider is exposed.
- Transparent flattening color is fixed to `#ffffff`; custom matte colors are not configurable.
- *[Pending Reference Site / Coda PDF Verification]*: Verify if AVIF input/output, ICO generation, or adjustable lossy quality are required by the reference specification.

---

## 5. Tool 4: PDF Merger and Splitter Audit

- **Route**: `/pdf-merger`
- **Component**: `PdfTool` in [src/components/tools/ImageTools.tsx](file:///c:/Users/Lenovo/OneDrive/Documents/3rd%20year/marvedge-tools/src/components/tools/ImageTools.tsx)
- **Primary Goal**: Combine multiple PDF documents into a single file or extract page ranges from an existing PDF.

### Existing Functionality Verified
- Mode toggle: `Merge PDFs` vs `Split / extract pages`.
- Built-in sample generators via `pdf-lib` (`dummyPdf` creates in-browser sample PDFs: 3-page quarterly report, 2-page invoice, 4-page handbook).
- Merge Mode:
  - Accepts multiple PDF files.
  - Lists loaded documents with name and page counts.
  - Reordering controls: `ArrowUp` and `ArrowDown` buttons allow changing document concatenation order.
  - Remove button (`X`) to exclude individual documents.
  - Merges all pages in sequential order via `PDFDocument.create()` and `copyPages()`.
  - Downloads result as `merged.pdf`.
- Split Mode:
  - Accepts single PDF.
  - Page range syntax input (`e.g. 1-3, 5, 8-10`), parsed by `parseRanges()`.
  - Extracts selected page indices and downloads as `extracted-pages.pdf`.
- Real browser test: Tested 2-document merge (reordered from invoice/report to report/invoice), verified 5 total pages merged, and tested single-document 2-page extraction without console errors.

### Libraries & Helpers Used
- `pdf-lib` (v1.17.1): Client-side document loading, page copying, font embedding, and serialization.
- `ui.tsx`: `download()` helper for PDF blob downloads, `Dropzone`, `Field`, `Btn`, `Panel`.
- Not affected by image helpers (`decodeImage`, `canvasToBlob`) because it operates on PDF binary structures rather than image pixel buffers.

### Limitations & Missing Functionality
- Does not render visual page thumbnails (requires a rasterizer like `pdfjs-dist`).
- Reordering operates at the whole-document level in merge mode; individual page-level reordering or page deletion across multiple documents is not supported.
- Does not support encrypted or password-protected PDFs (`ignoreEncryption: true` is passed, but encrypted content cannot be decrypted without a password prompt).
- Output is a single extracted PDF; does not support bursting all pages into a ZIP of individual 1-page PDFs.
- *[Pending Reference Site / Coda PDF Verification]*: Verify whether page thumbnail grids, visual drag-and-drop page reordering, or password handling are specified in the reference site or Coda documentation.

---

## 6. Action Items & Verification Protocol

When the deployed website URL and Coda Tools Description PDF are made available:
1. Compare accepted formats, dimension bounds, and maximum file sizes against the Coda specification.
2. Verify if visual before/after comparison sliders or interactive cropping overlays are required.
3. Validate whether document thumbnail rendering or password decryption is expected for PDF tools.
4. Replace all `*[Pending Reference Site / Coda PDF Verification]*` annotations with verified reference observations.
