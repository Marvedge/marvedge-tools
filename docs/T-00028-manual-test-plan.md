# T-00028 — Manual and Browser Integration Test Plan

Unit tests mock browser APIs in the Node environment (`tests/image-helpers.test.ts`). The following manual and integration verification steps must be conducted in real target browsers (Chrome, Edge, Firefox, Safari) once UI pages are integrated.

---

## 1. Decode Verification (`decodeImage`)

- [ ] **Valid JPEG**: Decodes successfully, returns positive width and height.
- [ ] **Valid PNG with Alpha**: Decodes successfully, transparent pixels preserved.
- [ ] **Valid WebP / AVIF / BMP**: Decodes in browsers supporting these codecs.
- [ ] **Empty File (0 bytes)**: Rejects cleanly with "The selected image is empty."
- [ ] **MIME Spoofing**: A PNG renamed to `.jpg` with declared `image/jpeg` is rejected with "The file content does not match its declared image format."
- [ ] **MIME Aliases**: A JPEG declared as `image/jpg` or PNG declared as `image/x-png` is accepted cleanly without false-positive spoofing rejection.
- [ ] **Unadorned Magic Bytes**: Files with empty or `application/octet-stream` MIME types decode properly if magic bytes match supported formats.
- [ ] **Non-Image Content**: SVG, animated GIF, PDF, HTML, and text files are rejected with "Unsupported or invalid image content."
- [ ] **File Size Boundary**: A file 1 byte over `maxFileSizeBytes` rejects before reading bytes or calling decoder.
- [ ] **Pixel Count Header Pre-check**: Oversized PNG/JPEG files reject before decoding based on header dimensions.
- [ ] **Pixel Count Post-decode Fallback**: Oversized files whose dimensions were not found in headers reject post-decode, and `bitmap.close()` is verified.
- [ ] **Corrupt Files**: Truncated images or disk read errors reject cleanly without leaking open bitmaps.

---

## 2. EXIF Orientation & Pixel Materialization (`correctImageOrientation`)

Use real test photo fixtures taken on modern smartphones with EXIF orientations 1 through 8:
- [ ] **Orientation 1 (0°)**: Normal landscape/portrait orientation maintained.
- [ ] **Orientation 2 (Horizontal Flip)**: Mirrored horizontally as indicated.
- [ ] **Orientation 3 (180°)**: Rotated upside down.
- [ ] **Orientation 4 (Vertical Flip)**: Mirrored vertically.
- [ ] **Orientation 5 (Transpose)**: 90° CW rotation + horizontal flip, dimensions swapped.
- [ ] **Orientation 6 (90° CW)**: Portrait photo taken vertically displays upright, width/height swapped.
- [ ] **Orientation 7 (Transverse)**: 90° CCW rotation + horizontal flip, dimensions swapped.
- [ ] **Orientation 8 (270° CW / 90° CCW)**: Photo displays upright, width/height swapped.
- [ ] **Double-Rotation Check**: Passing the output of `decodeImage()` to `correctImageOrientation()` materializes the pixels on canvas without applying a second rotation.
- [ ] **Downstream Stability**: Ensure subsequent canvas manipulations (crop, resize, export) do not re-read old EXIF tags.

---

## 3. Canvas Export (`canvasToBlob`)

- [ ] **PNG Export**: Exports valid PNG Blob, preserving alpha transparency.
- [ ] **JPEG Export & Background Flattening**: Transparent PNG exported to JPEG flattens transparency against white (`#ffffff`) background by default, preventing black artifact boxes.
- [ ] **Custom Background Flattening**: Custom `backgroundColor` fills transparent areas as specified.
- [ ] **WebP Export**: In supported browsers, exports valid WebP Blob at requested quality.
- [ ] **Fallback Detection**: If a browser engine does not support WebP canvas encoding, it rejects rather than silently returning PNG.
- [ ] **Quality Setting**: JPEG and WebP files exported at quality `0.2` are substantially smaller in byte size than at `0.95`.
- [ ] **Cross-Origin Tainted Canvas**: If an un-CORSed external image is drawn to canvas, `canvasToBlob` catches `SecurityError` and rejects with a clear explanatory error.

---

## 4. Safe Downloads (`downloadBlob`)

- [ ] **Valid Download**: Downloads file with intended content and sanitized name.
- [ ] **Path Traversal Protection**: Names like `../../malicious.png` are sanitized to `_.._.._malicious.png`.
- [ ] **Illegal Characters**: Characters like `*`, `?`, `:`, `"`, `<`, `>`, `|`, `/`, `\` are replaced with `_`.
- [ ] **Windows Device Names**: Reserved names like `CON.png`, `AUX.jpg`, `PRN`, `NUL`, `COM1.webp` are prefixed with `_` (e.g., `_CON.png`).
- [ ] **Extension Preservation**: Filenames exceeding 180 characters are truncated without slicing the file extension (e.g., `longname....jpg` retains `.jpg`).
- [ ] **Dot-only and Blank Names**: Empty strings, dots, and whitespace fall back safely to `download`.
- [ ] **URL Revocation Delay**: Object URLs remain valid for 30 seconds to allow browser download stream initialization before revocation.
- [ ] **Popup Blocker / Exception Handling**: If download anchor click throws, object URL is revoked immediately to prevent memory leaks.

---

## 5. Mocked Unit Tests vs. Real Browser Testing

### What the 67 Mocked Unit Tests Prove:
- Complete parameter validation and contract adherence.
- Binary magic byte sniffing logic (PNG, JPEG, WebP, AVIF, BMP) and rejection of active/animated formats (SVG, GIF, PDF, text).
- Rejection of MIME spoofing while honoring valid format aliases (`image/jpg`, `image/x-png`).
- Pre-decode header dimension checks and post-decode limits.
- Guaranteed `bitmap.close()` cleanup upon decode failure.
- Canvas export options validation, JPEG white background compositing, and propagation of compositing errors without exporting unflattened canvas.
- Filename sanitization, Windows reserved device name prefixing (`CON`, `PRN`, `AUX`, `NUL`), extension preservation during truncation, immediate revocation on anchor creation/append/click/timer failure, anchor removal across all failure paths, delayed revocation on success, and prevention of duplicate revocation.

### What Real Browser Integration Tests Must Prove (Cannot Be Proven by Mocked Tests):
- **Real Browser Decoder Compatibility**: Testing actual browser decoding implementations in Blink, Gecko, and WebKit.
- **Physical EXIF Orientation**: Verifying that actual JPEG files taken with smartphones exhibiting EXIF tags 1 through 8 render upright without double-rotation across Chrome, Safari, Firefox, and Edge.
- **Physical Device Memory Ceilings**: Confirming memory limits and canvas dimension limits (e.g., iOS Safari's ~16.7 megapixel / 4096x4096 ceiling) on actual physical devices.
- **OS Download Dialogs**: Verifying that triggering anchor clicks properly initiates browser file-saving workflows.

---

## 6. Automated Coverage Summary

All unit test suites run via `pnpm test` (`tests/image-helpers.test.ts`), covering:
- 67 automated test cases across 15 distinct functional and edge-case categories.
- Strict TypeScript verification (`pnpm exec tsc --noEmit`).
- Zero ESLint warnings (`pnpm lint`).
