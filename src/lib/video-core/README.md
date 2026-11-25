# Marvedge Shared Video Core (`src/lib/video-core`)

The **Shared Video Core** provides browser-native video probing, pre-flight memory estimation, and off-thread Web Worker GIF encoding. It is designed as a reusable, modular foundation for all video utilities in the Marvedge Micro-SaaS repository.

---

## 1. Why the Shared Video Core Was Introduced

### Baseline State (Commit `32a9f22`):

In the baseline repository prototype, `Mp4ToGif` in `src/components/tools/VideoTools.tsx` handled video conversions directly inside the React component:

- Frames were extracted and color-quantized (`gifenc` NeuQuant) on the main JavaScript UI thread.
- Conversions froze the browser window, preventing UI responsiveness or smooth progress animations.
- Files were assigned directly to a `<video>` element without pre-flight metadata probing or format validation.
- Unloaded or invalid video tracks produced `NaN` dimensions during proportional height calculations.
- There were no memory budget checks, creating crash risks on memory-constrained mobile browsers.
- No cancellation mechanism existed; users had to refresh or close the tab to stop long encodings.

### Delivered in T-00012:

- Offloaded CPU-heavy palette quantization and LZW encoding to a background Web Worker (`video.worker.ts`).
- Created a browser-native video prober (`probe.ts`) with early format/MIME validation and guaranteed cleanup.
- Implemented a pre-flight memory guard (`memory-guard.ts`) enforcing 250 MB contractual and 150 MB mobile budgets.
- Wired standard `AbortSignal` cancellation across the controller and worker threads.
- Added live progress streaming (`Making GIF… ${progress}%`) and looping trim preview.
- Provided a clean public API barrel (`index.ts`) ready for integration across the engineering team.

---

## 2. Architecture & Processing Workflow

```
                        Input File or Blob
                               │
                               ▼
                        [ probeVideo() ]
             Early format validation & metadata probe
            (Duration, Dimensions, Codec, Aspect Ratio)
                               │
                               ▼
                   [ estimateMemoryBudget() ]
               Pre-flight client RAM safety check
           (Reconciles 250 MB contract & 150 MB mobile limit)
                               │
                               ▼
                    [ encodeVideoToGif() ]
               Main Thread Canvas Frame Capture
                               │
            Zero-copy Transferable ArrayBuffer Stream
                               │
                               ▼
                      [ video.worker.ts ]
             Background NeuQuant & LZW Encoding
                               │
                               ▼
                   Progress Events & Result Blob
```

### Zero-Copy Frame Streaming:

Rather than buffering entire raw video streams in memory, the main-thread controller captures one frame at a time on an offscreen canvas and immediately transfers its underlying `ArrayBuffer` to the dedicated Web Worker via Transferable Objects (`postMessage({ type: "FRAME", ... }, [buffer])`). This transfers buffer ownership directly to the worker and releases main-thread frame references immediately without accumulating raw RGBA frames in the main-thread heap.

---

## 3. Core Modules & Responsibilities

```
src/lib/video-core/
├── types.ts          # Strict TypeScript contracts for metadata, options, worker messages, and results
├── probe.ts          # Browser-native HTMLVideoElement metadata inspector & early format validation
├── memory-guard.ts   # Pure calculation logic enforcing memory budgets and input boundaries
├── video.worker.ts   # Dedicated Web Worker executing NeuQuant palette quantization and LZW encoding
├── controller.ts     # Main-thread streaming frame extractor, worker lifecycle, and cancellation
├── index.ts          # Public barrel export exposing the reusable API surface
└── README.md         # Master technical specification and team integration guide
```

---

## 4. Public API Reference & Code Examples

All modules are consumed through the central entry point `@/lib/video-core`:

```typescript
import {
  probeVideo,
  estimateMemoryBudget,
  isSafeToProcess,
  encodeVideoToGif,
  DEFAULT_THRESHOLD_MB,
  MOBILE_SAFE_THRESHOLD_MB,
  ORIGINAL_SPEC_THRESHOLD_MB,
  type VideoMetadata,
  type ProbeOptions,
  type EncodingOptions,
  type EncodingProgress,
  type VideoProcessResult,
} from "@/lib/video-core";
```

### A. Probing Video Files (`probeVideo`)

Inspects duration, dimensions, aspect ratio, and codec support with timeout safety:

```typescript
const meta: VideoMetadata = await probeVideo(file, { timeoutMs: 6000 });

console.log(`Duration: ${meta.duration}s`);
console.log(`Dimensions: ${meta.width}x${meta.height}`);
console.log(`Aspect Ratio: ${meta.aspectRatio}`);
console.log(`MIME Type: ${meta.mimeType}`);
console.log(`Natively Playable: ${meta.isPlayable}`);

if (meta.codecWarning) {
  // e.g. "This file appears to use HEVC/H.265 compression..."
  console.warn(meta.codecWarning);
}
```

**Early Format Rejection:**
Non-video files and 0-byte inputs are rejected early before allocating media resources:

- Image files (`image/*` or `.jpg`, `.png`, `.webp`): `"Unsupported file type: Image files cannot be converted with the MP4 to GIF tool. Please select an MP4, MOV or WebM clip."`
- Text files (`text/*` or `.txt`, `.md`, `.json`): `"Unsupported file type: Text documents cannot be converted. Please select an MP4, MOV or WebM clip."`
- Audio files (`audio/*` or `.mp3`, `.wav`): `"Unsupported file type: Audio files contain no video track. Please select an MP4, MOV or WebM clip."`
- Unsupported extensions (`.pdf`, `.zip`, `.exe`): `"Unsupported file format: \"${fileName}\". Please select an MP4, MOV or WebM clip."`

### B. Pre-flight Memory Budget Estimation (`estimateMemoryBudget`)

Evaluates projected memory consumption before allocating canvas or worker resources:

```typescript
const budget = estimateMemoryBudget({
  width: 640,
  height: 360,
  duration: 5.0,
  fps: 15,
  thresholdMegabytes: DEFAULT_THRESHOLD_MB, // 250 MB default ceiling
});

if (!budget.isSafe) {
  throw new Error(budget.reason);
}
console.log(`Estimated peak memory: ${budget.estimatedPeakMegabytes} MB`);
console.log(`Total frames to encode: ${budget.totalFrames}`);
```

### C. Off-Thread GIF Encoding (`encodeVideoToGif`)

Streams video frames to the background worker with live progress and cancellation:

```typescript
const abortCtrl = new AbortController();

const result: VideoProcessResult = await encodeVideoToGif({
  video: videoElement,
  filename: "sample-clip.mp4",
  options: {
    startTime: 0.0,
    endTime: 3.5,
    width: 480,
    height: 270,
    fps: 15,
    colors: 128,
  },
  signal: abortCtrl.signal,
  onProgress: ({ percent, currentFrame, totalFrames }) => {
    console.log(`Encoding: ${percent}% (${currentFrame}/${totalFrames} frames)`);
  },
});

console.log("Generated GIF URL:", result.url);
console.log("Size in bytes:", result.sizeBytes);

// To cancel active processing:
// abortCtrl.abort();
```

---

## 5. Memory Guard Limits & Boundaries

| Parameter / Constant              |       Value       | Purpose                                                                              |
| :-------------------------------- | :---------------: | :----------------------------------------------------------------------------------- |
| `ORIGINAL_SPEC_THRESHOLD_MB`      |     `250 MB`      | Contractual ceiling specified in T-00012 task requirements.                          |
| `DEFAULT_THRESHOLD_MB`            |     `250 MB`      | Standard desktop processing ceiling.                                                 |
| `MOBILE_SAFE_THRESHOLD_MB`        |     `150 MB`      | Conservative ceiling designed for memory-constrained mobile environments.            |
| `MIN_DIMENSION` / `MAX_DIMENSION` | `16px` / `3840px` | Validates target width/height boundaries (rejects zero, negative, or `NaN`).         |
| `MAX_FPS`                         |     `60 FPS`      | Upper validation bound rejecting excessive frame rates.                              |
| `MAX_DURATION_SECONDS`            |      `60 s`       | Upper validation bound rejecting clips too long for client-side animated GIF export. |

---

## 6. Progress, Cancellation & Cleanup

1. **Monotonic Progress:** The Web Worker dispatches `PROGRESS` messages with `percent`, `currentFrame`, and `totalFrames`.
2. **Cancellation:** `signal?.addEventListener("abort", handleAbort)` posts an `ABORT` message to the worker, calls `worker.terminate()`, resets canvas dimensions to 0, and rejects the main Promise with `DOMException("Encoding aborted by user", "AbortError")`.
3. **Resource Cleanup:** Guaranteed cleanup of temporary `blob:` object URLs via `URL.revokeObjectURL(url)`.

---

## 7. Browser Compatibility & Known Limitations

### Web Standards Dependencies:

The Shared Video Core relies exclusively on standard Web APIs supported across modern browsers:

- `HTMLVideoElement` for frame decoding and playback controls.
- `HTMLCanvasElement` / 2D Canvas context for frame pixel extraction.
- Standard Web Workers (`new Worker(..., { type: "module" })`) for off-thread processing.
- `postMessage` with Transferable `ArrayBuffer` objects for zero-copy frame dispatch.

### Verification Status & Scope:

- **Automated Verification:** 10 test files and 51 tests pass cleanly in Node.js / JSDOM (with mocked media interfaces in `src/test/setup.ts`).
- **Manual Verification:** Interactive functionality (file upload, trimming, live playback preview, worker progress, cancellation, download) was tested locally on Desktop Chromium (Google Chrome / Microsoft Edge on Windows).
- **Physical Device & Multi-Browser Matrix:** Formal cross-browser testing (Firefox, macOS Safari) and physical mobile device validation (iOS Safari, Android Chrome) are officially scheduled for milestone **T-00018** (Cross-Browser QA) and milestone **T-00019** (Peer Testing & Release).

### Known Limitations:

1. **HEVC / H.265 Playback:** Apple QuickTime clips recorded in HEVC may fail to decode on Windows or Linux browsers lacking OS-level HEVC codecs. The prober inspects `video.canPlayType()` and surfaces an advisory banner when detection indicates potential decoding failure.
2. **Memory Guard Heuristics:** `estimateMemoryBudget` uses calculated pixel dimensions and frame counts (`singleFrameBytes * 4 + rawBytes * 0.20`). It is a protective application ceiling designed to reject excessively large jobs before processing; it does not query actual hardware RAM and cannot guarantee immunity against OS-level memory termination under external memory pressure.

---

## 8. Verification & Test Commands

Run the following commands from `D:\Marvedge\Final_tools_Marv`:

```bash
# Run full Vitest suite (10 test files, 51/51 tests passing)
npm test

# Run focused video-core integration tests
.\node_modules\.bin\vitest.cmd run src/test/video-core.test.ts

# Run focused memory guard tests
.\node_modules\.bin\vitest.cmd run src/test/memory-guard.test.ts

# Run focused probe tests
.\node_modules\.bin\vitest.cmd run src/test/probe.test.ts

# Run ESLint on video-core and tools
npx eslint src/lib/video-core/ src/components/tools/VideoTools.tsx

# Verify production Vite client and Nitro SSR build (Exit code 0)
npm run build
```

---

## 9. Team Integration & Handoff Guide (Milestone T-00013)

This section provides the shared technical foundation for **Engineer 3 (Abhishek)** and **Engineer 6 (Kajal)** for milestone T-00013.

_(Note: Individual tool assignments for subsequent milestones will be confirmed in official task schedules. Both engineers have access to the same shared video core foundation below.)_

### Technical Foundation for Both Engineers:

1. **Import Path:** Always import from `@/lib/video-core`. Do not import private sub-modules (e.g. `./video.worker.ts`) directly.
2. **Metadata Inspection:** Use `probeVideo(file)` to extract video duration, dimensions, and aspect ratio before initializing any UI controls.
3. **Memory Safety:** Use `estimateMemoryBudget(options)` or `isSafeToProcess(options)` before starting video processing to prevent out-of-memory errors. When building tools accessible to mobile users, pass `thresholdMegabytes: MOBILE_SAFE_THRESHOLD_MB` (150 MB).
4. **Asynchronous Worker Processing:** Use `encodeVideoToGif` for background processing without freezing the UI.
5. **Cancellation & Progress:** Connect an `AbortController` signal to an abort/cancel button and update progress via `onProgress: ({ percent }) => setProgress(percent)`.
6. **Cleanup:** Always release object URLs using `URL.revokeObjectURL(url)` on component unmount or reset.

### Practical Integration Checklist:

- [ ] Pull active branch `feature/t-00012-video-core`.
- [ ] Run `npm test` and verify that all 51 tests pass cleanly.
- [ ] Import modules through `@/lib/video-core`.
- [ ] Wrap `probeVideo` calls in `try/catch` to display rejected format messages to the user.
- [ ] Provide an `AbortController` instance to `encodeVideoToGif` and bind a visible "Cancel" action.
- [ ] Verify that non-video uploads (e.g. JPEG, TXT) display the rejected format message cleanly.
- [ ] Run `npm run build` to confirm production client and Nitro SSR builds succeed with exit code 0.

---

## 10. Troubleshooting

| Issue / Error                                  | Cause                                                               | Resolution                                                                                                       |
| :--------------------------------------------- | :------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| **"Video dimensions could not be determined"** | Video dimensions read before metadata was fully loaded.             | Await `probeVideo(file)` before performing dimension calculations.                                               |
| **"Memory budget exceeded..."**                | Target resolution or clip length exceeds memory threshold.          | Reduce export width (e.g. 960px to 640px) or clip duration.                                                      |
| **Amber HEVC warning displayed**               | Clip uses Apple HEVC/H.265 compression unplayable on some browsers. | Inform user or advise using standard H.264 MP4.                                                                  |
| **Worker bundling error in Vite**              | Incorrect worker instantiation syntax.                              | Use standard ESM worker syntax: `new Worker(new URL("./video.worker.ts", import.meta.url), { type: "module" })`. |

---

## 11. Attribution & Ownership

- **Platform Ownership:** Marvedge Platform
- **Documentation and implementation contributions by Jitendra Kumar Verma.**
