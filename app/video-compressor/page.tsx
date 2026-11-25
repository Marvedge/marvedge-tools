
"use client";

import { useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE_MB = 100;
const AUDIO_BITRATE = 128_000;

const PRESETS = [
  { label: "Chat / Web — 25 MB", size: 25 },
  { label: "Standard — 50 MB", size: 50 },
  { label: "High quality — 100 MB", size: 100 },
];

const RESOLUTIONS = [1080, 720, 480, 360];

type CompressionResult = {
  url: string;
  name: string;
  size: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSupportedMimeType() {
  const types = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function getBaseName(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

export default function VideoCompressorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const [targetSize, setTargetSize] = useState(25);
  const [resolution, setResolution] = useState(720);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);

  // Release preview and result URLs when they change or the page unmounts.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const estimatedBitrate = duration > 0
    ? Math.max(
        150_000,
        Math.floor(
          ((targetSize * 1024 * 1024 * 8) / duration) -
            AUDIO_BITRATE
        )
      )
    : 0;

  const estimatedOutputSize = duration > 0
    ? ((estimatedBitrate + AUDIO_BITRATE) * duration) / 8
    : 0;

  function chooseFile(selectedFile?: File) {
    if (!selectedFile) return;

    setError("");
    setMessage("");
    setResult(null);

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (selectedFile.size > maxBytes) {
      setError(
        `This file is ${formatBytes(selectedFile.size)}. ` +
          `The current limit is ${MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }

    const newUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setVideoUrl(newUrl);
    setDuration(0);
    setProgress(0);
  }

  function resetFile() {
    if (busy) return;

    setFile(null);
    setVideoUrl("");
    setDuration(0);
    setProgress(0);
    setError("");
    setMessage("");
    setResult(null);
  }

  function stopRecording() {
    cancelledRef.current = true;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    videoRef.current?.pause();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function compressVideo() {
    const video = videoRef.current;

    if (!file || !video) {
      setError("Please select a video first.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight || !duration) {
      setError("Wait until the video has loaded before compressing.");
      return;
    }

    if (!("MediaRecorder" in window)) {
      setError("Your browser does not support video recording.");
      return;
    }

    const mimeType = getSupportedMimeType();

    if (!mimeType) {
      setError("Your browser does not support a compatible video format.");
      return;
    }

    cancelledRef.current = false;
    setBusy(true);
    setProgress(0);
    setError("");
    setMessage("");
    setResult(null);

    let canvasStream: MediaStream | null = null;
    let sourceStream: MediaStream | null = null;

    try {
      video.pause();

      // Calculate output dimensions while preserving the original aspect ratio.
      const outputHeight = Math.min(resolution, video.videoHeight);
      const outputWidth = Math.max(
        2,
        Math.round(
          (video.videoWidth / video.videoHeight) * outputHeight / 2
        ) * 2
      );

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create the video processing canvas.");
      }

      // Target size -> total bitrate -> video bitrate.
      const totalTargetBitrate =
        (targetSize * 1024 * 1024 * 8) / duration;

      const videoBitrate = Math.max(
        150_000,
        Math.floor(totalTargetBitrate - AUDIO_BITRATE)
      );

      canvasStream = canvas.captureStream(30);

      // Preserve audio when the browser exposes the source audio stream.
      const captureVideo = video as HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };

      sourceStream =
        captureVideo.captureStream?.() ??
        captureVideo.mozCaptureStream?.() ??
        null;

      sourceStream?.getAudioTracks().forEach((track) => {
        canvasStream?.addTrack(track);
      });

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: AUDIO_BITRATE,
      });

      recorderRef.current = recorder;
      streamRef.current = canvasStream;

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const recordingPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          resolve(
            new Blob(chunks, {
              type: mimeType.split(";")[0] || "video/webm",
            })
          );
        };

        recorder.onerror = () => {
          reject(new Error("The browser encountered a recording error."));
        };
      });

      // Start from the beginning of the video.
      video.currentTime = 0;

      await new Promise<void>((resolve) => {
        if (video.readyState >= 2 && video.currentTime === 0) {
          resolve();
        } else {
          video.addEventListener("seeked", () => resolve(), { once: true });
        }
      });

      recorder.start(500);

      const drawFrame = () => {
        if (cancelledRef.current) return;

        context.drawImage(video, 0, 0, outputWidth, outputHeight);

        const percent = Math.min(
          100,
          Math.round((video.currentTime / duration) * 100)
        );

        setProgress(percent);

        if (video.currentTime >= duration || video.ended) {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
          return;
        }

        animationRef.current = requestAnimationFrame(drawFrame);
      };

      await video.play();
      drawFrame();

      const outputBlob = await recordingPromise;

      if (cancelledRef.current) {
        setMessage("Compression cancelled.");
        return;
      }

      if (!outputBlob.size) {
        throw new Error("The browser produced an empty output file.");
      }

      const outputUrl = URL.createObjectURL(outputBlob);
      const extension = outputBlob.type.includes("mp4") ? "mp4" : "webm";

      setResult({
        url: outputUrl,
        name: `${getBaseName(file.name)}-compressed.${extension}`,
        size: outputBlob.size,
      });

      setProgress(100);
      setMessage("Compression completed.");
    } catch (err) {
      if (cancelledRef.current) {
        setMessage("Compression cancelled.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Compression failed. Please try another video."
        );
      }
    } finally {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      video.pause();

      canvasStream?.getTracks().forEach((track) => track.stop());
      sourceStream?.getTracks().forEach((track) => track.stop());

      recorderRef.current = null;
      streamRef.current = null;
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Video Compressor</h1>
          <p className="mt-2 text-zinc-600">
            Compress videos in your browser with a target file size.
            Your video is processed locally.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {!file ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 p-10 text-center hover:border-blue-500">
              <span className="text-lg font-semibold">
                Select or drop a video
              </span>
              <span className="mt-2 text-sm text-zinc-500">
                Maximum input size: {MAX_FILE_SIZE_MB} MB
              </span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="space-y-5">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="max-h-[420px] w-full rounded-xl bg-black"
                onLoadedMetadata={(event) => {
                  setDuration(event.currentTarget.duration);
                }}
                onError={() => {
                  setError("Could not load this video. Try another format.");
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="break-all font-medium">{file.name}</span>
                <span className="text-zinc-500">
                  {formatBytes(file.size)}
                  {duration > 0 ? ` · ${duration.toFixed(1)} seconds` : ""}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-sm font-semibold">
                    Target output size
                  </span>
                  <select
                    value={targetSize}
                    disabled={busy}
                    onChange={(event) => setTargetSize(Number(event.target.value))}
                    className="w-full rounded-lg border border-zinc-300 bg-white p-3"
                  >
                    {PRESETS.map((preset) => (
                      <option key={preset.size} value={preset.size}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-semibold">
                    Output resolution
                  </span>
                  <select
                    value={resolution}
                    disabled={busy}
                    onChange={(event) => setResolution(Number(event.target.value))}
                    className="w-full rounded-lg border border-zinc-300 bg-white p-3"
                  >
                    {RESOLUTIONS.map((height) => (
                      <option key={height} value={height}>
                        {height}p
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-lg bg-zinc-100 p-4 text-sm">
                <p>
                  Estimated output:{" "}
                  <strong>{formatBytes(estimatedOutputSize)}</strong>
                </p>
                <p className="mt-1">
                  Calculated video bitrate:{" "}
                  <strong>{(estimatedBitrate / 1_000_000).toFixed(2)} Mbps</strong>
                </p>
                <p className="mt-2 text-zinc-500">
                  Actual file size may differ because browser encoding is
                  approximate.
                </p>
              </div>

              {busy && (
                <div className="space-y-2" aria-live="polite">
                  <div className="flex justify-between text-sm">
                    <span>Processing video...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy || duration <= 0}
                  onClick={compressVideo}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Compress video
                </button>

                {busy && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={resetFile}
                  className="rounded-lg border border-zinc-300 px-5 py-3 font-semibold hover:bg-zinc-100 disabled:opacity-50"
                >
                  Choose another video
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p aria-live="polite" className="mt-4 text-sm text-zinc-600">
              {message}
            </p>
          )}

          {result && (
            <div className="mt-6 space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="font-semibold text-green-900">
                Compressed video ready
              </h2>
              <video
                src={result.url}
                controls
                className="max-h-80 w-full rounded-lg bg-black"
              />
              <p className="text-sm text-green-900">
                Output size: {formatBytes(result.size)}
              </p>
              <a
                href={result.url}
                download={result.name}
                className="inline-block rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
              >
                Download video
              </a>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
