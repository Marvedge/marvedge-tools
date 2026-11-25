import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { seekVideo, encodeVideoToGif } from "@/lib/video-core/controller";
import type { WorkerInMessage, WorkerOutMessage } from "@/lib/video-core/types";

describe("Video Core — seekVideo", () => {
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockVideo = document.createElement("video");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves immediately if already at target timestamp and ready", async () => {
    Object.defineProperty(mockVideo, "currentTime", { value: 2.0, writable: true });
    Object.defineProperty(mockVideo, "readyState", { value: 3, writable: true });

    await expect(seekVideo(mockVideo, 2.0)).resolves.toBeUndefined();
  });

  it("resolves when onseeked event fires", async () => {
    Object.defineProperty(mockVideo, "currentTime", { value: 0.0, writable: true });
    Object.defineProperty(mockVideo, "readyState", { value: 1, writable: true });

    const seekPromise = seekVideo(mockVideo, 3.5);

    mockVideo.onseeked?.(new Event("seeked"));

    await expect(seekPromise).resolves.toBeUndefined();
    expect(mockVideo.currentTime).toBe(3.5);
  });

  it("rejects when seek times out", async () => {
    Object.defineProperty(mockVideo, "currentTime", { value: 0.0, writable: true });
    Object.defineProperty(mockVideo, "readyState", { value: 1, writable: true });

    const seekPromise = seekVideo(mockVideo, 5.0, 1000);

    vi.advanceTimersByTime(1050);

    await expect(seekPromise).rejects.toThrow("Seek to 5.00s timed out after 1000ms");
  });

  it("rejects when video fires error during seek", async () => {
    Object.defineProperty(mockVideo, "currentTime", { value: 0.0, writable: true });
    Object.defineProperty(mockVideo, "readyState", { value: 1, writable: true });

    const seekPromise = seekVideo(mockVideo, 4.0);

    mockVideo.onerror?.(new Event("error"));

    await expect(seekPromise).rejects.toThrow("Error seeking video to 4.00s");
  });
});

describe("Video Core — encodeVideoToGif Orchestration", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-gif");

    // Mock HTMLCanvasElement.getContext for JSDOM
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(160 * 90 * 4),
        }),
      } as unknown as CanvasRenderingContext2D;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Simple Mock Worker for Controller testing */
  class MockWorker {
    public onmessage: ((e: MessageEvent<WorkerOutMessage>) => void) | null = null;
    public onerror: ((e: ErrorEvent) => void) | null = null;
    public messages: WorkerInMessage[] = [];
    public terminated = false;

    postMessage(msg: WorkerInMessage) {
      this.messages.push(msg);

      if (msg.type === "INIT") {
        // Acknowledge init
      } else if (msg.type === "ADD_FRAME") {
        this.onmessage?.(
          new MessageEvent("message", {
            data: {
              type: "PROGRESS",
              percent: Math.round(((msg.frameIndex + 1) / msg.totalFrames) * 100),
              currentFrame: msg.frameIndex + 1,
              totalFrames: msg.totalFrames,
            },
          }),
        );
      } else if (msg.type === "FINISH") {
        const fakeGif = new ArrayBuffer(2048);
        this.onmessage?.(
          new MessageEvent("message", {
            data: {
              type: "SUCCESS",
              gifBuffer: fakeGif,
              totalFrames: this.messages.filter((m) => m.type === "ADD_FRAME").length,
              byteLength: fakeGif.byteLength,
            },
          }),
        );
      }
    }

    terminate() {
      this.terminated = true;
    }
  }

  it("rejects immediately if signal is already aborted", async () => {
    const video = document.createElement("video");
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    await expect(
      encodeVideoToGif({
        video,
        filename: "test.mp4",
        options: {
          startTime: 0,
          endTime: 2,
          width: 320,
          height: 180,
          fps: 10,
          colors: 64,
        },
        signal: abortCtrl.signal,
      }),
    ).rejects.toThrow("Encoding aborted by user");
  });

  it("rejects if parameters exceed safe memory budget", async () => {
    const video = document.createElement("video");

    await expect(
      encodeVideoToGif({
        video,
        filename: "test.mp4",
        options: {
          startTime: 0,
          endTime: 30, // 30s at 1080p will exceed default threshold
          width: 1920,
          height: 1080,
          fps: 30,
          colors: 128,
        },
      }),
    ).rejects.toThrow(/exceeds the configured safe threshold/);
  });

  it("successfully streams frames to worker, reports progress, and returns result", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "currentTime", { value: 0, writable: true });
    Object.defineProperty(video, "readyState", { value: 3, writable: true });

    let activeWorker: MockWorker | null = null;
    const workerFactory = () => {
      activeWorker = new MockWorker();
      return activeWorker as unknown as Worker;
    };

    const progressReports: number[] = [];

    const result = await encodeVideoToGif({
      video,
      filename: "sample-demo.mp4",
      options: {
        startTime: 0,
        endTime: 0.3, // 3 frames @ 10 FPS
        width: 160,
        height: 90,
        fps: 10,
        colors: 32,
      },
      onProgress: (p) => progressReports.push(p.percent),
      workerFactory,
      seekFn: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.url).toBe("blob:http://localhost/mock-gif");
    expect(result.filename).toBe("sample-demo.gif");
    expect(result.sizeBytes).toBe(2048);
    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[progressReports.length - 1]).toBe(100);
    expect((activeWorker as MockWorker | null)?.terminated).toBe(true);
  });
});
