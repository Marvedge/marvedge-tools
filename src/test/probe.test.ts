import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { probeVideo } from "@/lib/video-core/probe";

describe("Video Prober — probeVideo", () => {
  let createdUrl: string | null = null;
  let revokedUrl: string | null = null;

  beforeEach(() => {
    createdUrl = null;
    revokedUrl = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      createdUrl = "blob:http://localhost/mock-video-url";
      return createdUrl;
    });

    vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
      revokedUrl = url;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid, null or non-blob inputs", async () => {
    // @ts-expect-error testing invalid input
    await expect(probeVideo(null)).rejects.toThrow("Expected a valid File or Blob");
    // @ts-expect-error testing invalid input
    await expect(probeVideo("not-a-file")).rejects.toThrow("Expected a valid File or Blob");
  });

  it("rejects empty 0-byte files", async () => {
    const emptyFile = new File([], "empty.mp4", { type: "video/mp4" });
    await expect(probeVideo(emptyFile)).rejects.toThrow("The selected file is empty (0 bytes)");
  });

  it("successfully probes video metadata and cleans up object URL", async () => {
    const mockFile = new File(["dummy video data content"], "test-clip.mp4", { type: "video/mp4" });

    // Intercept video creation to simulate browser metadata event
    const createElementSpy = vi.spyOn(document, "createElement");

    const probePromise = probeVideo(mockFile);

    // Find the created video element
    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    expect(videoInstance).toBeDefined();

    // Mock video properties as decoded by browser
    Object.defineProperty(videoInstance, "duration", { value: 6.42, configurable: true });
    Object.defineProperty(videoInstance, "videoWidth", { value: 1280, configurable: true });
    Object.defineProperty(videoInstance, "videoHeight", { value: 720, configurable: true });
    videoInstance.canPlayType = vi.fn().mockReturnValue("probably");

    // Trigger metadata event
    videoInstance.onloadedmetadata?.(new Event("loadedmetadata"));

    const metadata = await probePromise;

    expect(metadata.duration).toBe(6.42);
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(720);
    expect(metadata.aspectRatio).toBe(1.7778); // 1280 / 720
    expect(metadata.mimeType).toBe("video/mp4");
    expect(metadata.isPlayable).toBe(true);
    expect(metadata.codecWarning).toBeUndefined();

    // Verify object URL was cleanly revoked
    expect(revokedUrl).toBe(createdUrl);
  });

  it("detects HEVC/H.265 files and attaches an advisory warning", async () => {
    const hevcFile = new File(["dummy hevc content"], "record.hevc", { type: "video/mp4" });

    const createElementSpy = vi.spyOn(document, "createElement");
    const probePromise = probeVideo(hevcFile);

    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    Object.defineProperty(videoInstance, "duration", { value: 3.5, configurable: true });
    Object.defineProperty(videoInstance, "videoWidth", { value: 1920, configurable: true });
    Object.defineProperty(videoInstance, "videoHeight", { value: 1080, configurable: true });
    videoInstance.canPlayType = vi.fn().mockReturnValue("maybe");

    videoInstance.onloadedmetadata?.(new Event("loadedmetadata"));

    const metadata = await probePromise;

    expect(metadata.codecWarning).toBeDefined();
    expect(metadata.codecWarning).toContain("HEVC/H.265");
  });

  it("rejects videos with invalid dimensions (0x0) and cleans up", async () => {
    const mockFile = new File(["bad video"], "audio-only.mp4", { type: "video/mp4" });

    const createElementSpy = vi.spyOn(document, "createElement");
    const probePromise = probeVideo(mockFile);

    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    Object.defineProperty(videoInstance, "duration", { value: 10.0, configurable: true });
    Object.defineProperty(videoInstance, "videoWidth", { value: 0, configurable: true });
    Object.defineProperty(videoInstance, "videoHeight", { value: 0, configurable: true });

    videoInstance.onloadedmetadata?.(new Event("loadedmetadata"));

    await expect(probePromise).rejects.toThrow("Video contains no valid frame dimensions");
    expect(revokedUrl).toBe(createdUrl);
  });

  it("rejects videos with invalid duration (<= 0 or NaN)", async () => {
    const mockFile = new File(["bad stream"], "stream.mp4", { type: "video/mp4" });

    const createElementSpy = vi.spyOn(document, "createElement");
    const probePromise = probeVideo(mockFile);

    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    Object.defineProperty(videoInstance, "duration", { value: Number.NaN, configurable: true });
    Object.defineProperty(videoInstance, "videoWidth", { value: 640, configurable: true });
    Object.defineProperty(videoInstance, "videoHeight", { value: 360, configurable: true });

    videoInstance.onloadedmetadata?.(new Event("loadedmetadata"));

    await expect(probePromise).rejects.toThrow("Unable to determine video duration");
    expect(revokedUrl).toBe(createdUrl);
  });

  it("handles decode errors properly and cleans up object URL", async () => {
    const mockFile = new File(["corrupt video"], "corrupt.mp4", { type: "video/mp4" });

    const createElementSpy = vi.spyOn(document, "createElement");
    const probePromise = probeVideo(mockFile);

    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    Object.defineProperty(videoInstance, "error", {
      value: { code: 4 }, // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
      configurable: true,
    });

    videoInstance.onerror?.(new Event("error"));

    await expect(probePromise).rejects.toThrow(
      "Video format or codec is not supported by your browser",
    );
    expect(revokedUrl).toBe(createdUrl);
  });

  it("handles timeout correctly when video stalls or hangs", async () => {
    vi.useFakeTimers();

    const mockFile = new File(["hanging video"], "hang.mp4", { type: "video/mp4" });
    const probePromise = probeVideo(mockFile, { timeoutMs: 1000 });

    // Advance timers past timeout
    vi.advanceTimersByTime(1050);

    await expect(probePromise).rejects.toThrow("Video probe timed out after 1000ms");
    expect(revokedUrl).toBe(createdUrl);

    vi.useRealTimers();
  });

  it("rejects image files early with a clear error message", async () => {
    const imageFile = new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });
    await expect(probeVideo(imageFile)).rejects.toThrow(
      "Unsupported file type: Image files cannot be converted",
    );
  });

  it("rejects text documents early with a clear error message", async () => {
    const txtFile = new File(["hello world"], "notes.txt", { type: "text/plain" });
    await expect(probeVideo(txtFile)).rejects.toThrow(
      "Unsupported file type: Text documents cannot be converted",
    );
  });

  it("rejects audio files early with a clear error message", async () => {
    const audioFile = new File(["audio-bytes"], "song.mp3", { type: "audio/mp3" });
    await expect(probeVideo(audioFile)).rejects.toThrow(
      "Unsupported file type: Audio files contain no video track",
    );
  });

  it("rejects non-video extensions early before creating media element", async () => {
    const pdfFile = new File(["pdf-bytes"], "manual.pdf", { type: "application/pdf" });
    await expect(probeVideo(pdfFile)).rejects.toThrow("Unsupported file format");
  });

  it("rejects invalid or zero frame dimensions", async () => {
    const mockFile = new File(["dummy video"], "test-zero-dim.mp4", { type: "video/mp4" });
    const createElementSpy = vi.spyOn(document, "createElement");
    const probePromise = probeVideo(mockFile);

    const videoInstance = createElementSpy.mock.results[0]?.value as HTMLVideoElement;
    Object.defineProperty(videoInstance, "duration", { value: 5, configurable: true });
    Object.defineProperty(videoInstance, "videoWidth", { value: 0, configurable: true });
    Object.defineProperty(videoInstance, "videoHeight", { value: 0, configurable: true });

    videoInstance.onloadedmetadata?.(new Event("loadedmetadata"));

    await expect(probePromise).rejects.toThrow("Video contains no valid frame dimensions");
    expect(revokedUrl).toBe(createdUrl);
  });
});
