
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE_MB = 100;

const RATIOS = {
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 720, height: 1280 },
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
} as const;

type Ratio = keyof typeof RATIOS;
type FillMode = "fit" | "blur" | "crop";

type ExportResult = {
    url: string;
    name: string;
    size: number;
    type: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getBaseName(filename: string) {
    return filename.replace(/\.[^/.]+$/, "");
}

function getSupportedMimeType() {
    if (typeof MediaRecorder === "undefined") return "";

    const types = [
        "video/mp4;codecs=avc1",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function drawFrame(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
    mode: FillMode,
    color: string,
    positionX: number,
    positionY: number
) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return;

    const targetRatio = width / height;
    const sourceRatio = videoWidth / videoHeight;

    const coverScale = Math.max(
        width / videoWidth,
        height / videoHeight
    );

    const containScale = Math.min(
        width / videoWidth,
        height / videoHeight
    );

    if (mode === "crop") {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        if (sourceRatio > targetRatio) {
            const cropWidth = videoHeight * targetRatio;
            const sourceX = (videoWidth - cropWidth) * positionX;

            ctx.drawImage(
                video,
                sourceX,
                0,
                cropWidth,
                videoHeight,
                0,
                0,
                width,
                height
            );
        } else {
            const cropHeight = videoWidth / targetRatio;
            const sourceY = (videoHeight - cropHeight) * positionY;

            ctx.drawImage(
                video,
                0,
                sourceY,
                videoWidth,
                cropHeight,
                0,
                0,
                width,
                height
            );
        }

        return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    if (mode === "blur") {
        ctx.save();
        ctx.filter = "blur(28px) brightness(0.65)";

        const backgroundWidth = videoWidth * coverScale;
        const backgroundHeight = videoHeight * coverScale;

        ctx.drawImage(
            video,
            (width - backgroundWidth) / 2,
            (height - backgroundHeight) / 2,
            backgroundWidth,
            backgroundHeight
        );

        ctx.restore();
    }

    const foregroundWidth = videoWidth * containScale;
    const foregroundHeight = videoHeight * containScale;

    ctx.drawImage(
        video,
        (width - foregroundWidth) / 2,
        (height - foregroundHeight) / 2,
        foregroundWidth,
        foregroundHeight
    );
}

export default function VideoAspectRatioPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    const exportAnimationRef = useRef<number | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cancelledRef = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [duration, setDuration] = useState(0);

    const [ratio, setRatio] = useState<Ratio>("9:16");
    const [mode, setMode] = useState<FillMode>("blur");
    const [backgroundColor, setBackgroundColor] = useState("#000000");
    const [positionX, setPositionX] = useState(0.5);
    const [positionY, setPositionY] = useState(0.5);

    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [result, setResult] = useState<ExportResult | null>(null);

    const selectedRatio = RATIOS[ratio];

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

    const paint = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            video: HTMLVideoElement,
            width: number,
            height: number
        ) => {
            drawFrame(
                ctx,
                video,
                width,
                height,
                mode,
                backgroundColor,
                positionX,
                positionY
            );
        },
        [mode, backgroundColor, positionX, positionY]
    );

    // Live output preview.
    useEffect(() => {
        const video = videoRef.current;
        const canvas = previewCanvasRef.current;

        if (!video || !canvas) return;

        const previewWidth = 480;
        const previewHeight = Math.round(
            previewWidth * selectedRatio.height / selectedRatio.width
        );

        canvas.width = previewWidth;
        canvas.height = previewHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let active = true;
        let previewFrame: number | null = null;

        const render = () => {
            if (!active) return;

            paint(ctx, video, canvas.width, canvas.height);
            previewFrame = requestAnimationFrame(render);
        };

        render();

        return () => {
            active = false;

            if (previewFrame !== null) {
                cancelAnimationFrame(previewFrame);
            }
        };
    }, [videoUrl, selectedRatio, paint]);

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
            setError(`The video exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
            return;
        }

        setFile(selectedFile);
        setVideoUrl(URL.createObjectURL(selectedFile));
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

        if (exportAnimationRef.current !== null) {
            cancelAnimationFrame(exportAnimationRef.current);
            exportAnimationRef.current = null;
        }

        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());

        const video = videoRef.current;
        video?.pause();

        setBusy(false);
        setMessage("");
    }

    async function exportVideo() {
        const video = videoRef.current;
        const canvas = exportCanvasRef.current;

        if (!video || !canvas || !file) return;

        if (!video.videoWidth || !video.videoHeight || duration <= 0) {
            setError("Wait until the video has loaded before exporting.");
            return;
        }

        if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
            setError("Video recording is not supported in this browser.");
            return;
        }

        const mimeType = getSupportedMimeType();
        if (!mimeType) {
            setError("This browser does not support MP4 or WebM recording.");
            return;
        }

        setBusy(true);
        setProgress(0);
        setError("");
        setMessage("");
        setResult(null);
        cancelledRef.current = false;

        video.pause();
        video.onended = null;

        const outputWidth = selectedRatio.width;
        const outputHeight = selectedRatio.height;
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setBusy(false);
            setError("Could not initialize the export canvas.");
            return;
        }

        let recorder: MediaRecorder | null = null;
        let canvasStream: MediaStream | null = null;

        try {
            // Wait for a seek to the first frame when necessary.
            if (Math.abs(video.currentTime) > 0.01) {
                await new Promise<void>((resolve, reject) => {
                    const cleanup = () => {
                        video.removeEventListener("seeked", onSeeked);
                        video.removeEventListener("error", onError);
                    };
                    const onSeeked = () => {
                        cleanup();
                        resolve();
                    };
                    const onError = () => {
                        cleanup();
                        reject(new Error("Could not seek to the start of the video."));
                    };

                    video.addEventListener("seeked", onSeeked, { once: true });
                    video.addEventListener("error", onError, { once: true });
                    video.currentTime = 0;
                });
            }

            // Wait until a decoded frame is available.
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                await new Promise<void>((resolve, reject) => {
                    const cleanup = () => {
                        video.removeEventListener("loadeddata", onLoaded);
                        video.removeEventListener("error", onError);
                    };
                    const onLoaded = () => {
                        cleanup();
                        resolve();
                    };
                    const onError = () => {
                        cleanup();
                        reject(new Error("The browser could not decode this video."));
                    };

                    video.addEventListener("loadeddata", onLoaded, { once: true });
                    video.addEventListener("error", onError, { once: true });
                });
            }

            // Create output stream. 24 FPS reduces encoding workload.
            canvasStream = canvas.captureStream(24);
            streamRef.current = canvasStream;

            // Add source audio when the browser supports capturing it.
            try {
                const captureVideo = video as HTMLVideoElement & {
                    captureStream?: () => MediaStream;
                    mozCaptureStream?: () => MediaStream;
                };
                const sourceStream =
                    captureVideo.captureStream?.() ??
                    captureVideo.mozCaptureStream?.();

                sourceStream?.getAudioTracks().forEach((track) => {
                    canvasStream?.addTrack(track);
                });
            } catch {
                // Some browsers do not expose audio capture from local video.
            }

            recorder = new MediaRecorder(canvasStream, {
                mimeType,
                videoBitsPerSecond: 4_000_000,
            });
            recorderRef.current = recorder;

            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            };

            recorder.onerror = () => {
                setError("An error occurred while recording the video.");
                setBusy(false);
            };

            recorder.onstop = () => {
                canvasStream?.getTracks().forEach((track) => track.stop());
                video.pause();
                video.onended = null;

                if (cancelledRef.current) {
                    setBusy(false);
                    setProgress(0);
                    return;
                }

                const outputBlob = new Blob(chunks, {
                    type: mimeType.split(";")[0],
                });

                if (!outputBlob.size) {
                    setError("The exported video is empty. Please try again.");
                    setBusy(false);
                    return;
                }

                const outputUrl = URL.createObjectURL(outputBlob);
                const extension = outputBlob.type.includes("mp4") ? "mp4" : "webm";

                setResult({
                    url: outputUrl,
                    name: `${getBaseName(file.name)}-${ratio.replace(":", "x")}.${extension}`,
                    size: outputBlob.size,
                    type: extension.toUpperCase(),
                });
                setProgress(100);
                setMessage(`Export completed as ${extension.toUpperCase()}.`);
                setBusy(false);
            };

            // Paint a valid first frame before recording.
            paint(ctx, video, outputWidth, outputHeight);

            // Attach end handler before playback begins.
            video.onended = () => {
                if (exportAnimationRef.current !== null) {
                    cancelAnimationFrame(exportAnimationRef.current);
                    exportAnimationRef.current = null;
                }
                if (recorder?.state === "recording") recorder.stop();
            };

            // Start recorder first so the first video frames are not missed.
            recorder.start(500);

            await video.play();

            let lastReportedProgress = -1;
            const renderExportFrame = () => {
                if (cancelledRef.current || recorder?.state !== "recording") return;

                paint(ctx, video, outputWidth, outputHeight);

                if (duration > 0) {
                    const percentage = Math.min(
                        99,
                        Math.round((video.currentTime / duration) * 100)
                    );
                    if (percentage !== lastReportedProgress) {
                        lastReportedProgress = percentage;
                        setProgress(percentage);
                    }
                }

                exportAnimationRef.current = requestAnimationFrame(renderExportFrame);
            };

            renderExportFrame();
        } catch (error) {
            cancelledRef.current = true;

            if (exportAnimationRef.current !== null) {
                cancelAnimationFrame(exportAnimationRef.current);
                exportAnimationRef.current = null;
            }
            if (recorder?.state === "recording") recorder.stop();
            canvasStream?.getTracks().forEach((track) => track.stop());
            video.pause();
            video.onended = null;
            setBusy(false);
            setError(
                error instanceof Error
                    ? `Export failed: ${error.message}`
                    : "Could not play or export this video."
            );
        }
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
            <section className="mx-auto w-full max-w-5xl space-y-6">
                <header>
                    <h1 className="text-3xl font-bold">
                        Video Aspect Ratio Changer
                    </h1>
                    <p className="mt-2 text-zinc-600">
                        Reframe videos for social media and different screen formats.
                        Your video is processed locally in your browser.
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
                        <div className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-3">
                                    <h2 className="font-semibold">Original video</h2>
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

                                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                                        <span className="break-all font-medium">{file.name}</span>
                                        <span className="text-zinc-500">
                                            {formatBytes(file.size)}
                                            {duration > 0
                                                ? ` · ${duration.toFixed(1)} seconds`
                                                : ""}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h2 className="font-semibold">Output preview</h2>
                                    <div className="flex min-h-[300px] items-center justify-center rounded-xl bg-zinc-100 p-4">
                                        <canvas
                                            ref={previewCanvasRef}
                                            className="max-h-[420px] max-w-full rounded-lg bg-black shadow-sm"
                                        />
                                    </div>
                                    <p className="text-sm text-zinc-500">
                                        Preview follows the selected ratio and fill settings.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="block text-sm font-semibold">
                                        Aspect ratio
                                    </span>
                                    <select
                                        value={ratio}
                                        disabled={busy}
                                        onChange={(event) => setRatio(event.target.value as Ratio)}
                                        className="w-full rounded-lg border border-zinc-300 bg-white p-3"
                                    >
                                        {Object.keys(RATIOS).map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="block text-sm font-semibold">
                                        Fill style
                                    </span>
                                    <select
                                        value={mode}
                                        disabled={busy}
                                        onChange={(event) =>
                                            setMode(event.target.value as FillMode)
                                        }
                                        className="w-full rounded-lg border border-zinc-300 bg-white p-3"
                                    >
                                        <option value="fit">Fit with background bars</option>
                                        <option value="blur">Blurred background fill</option>
                                        <option value="crop">Crop to fill</option>
                                    </select>
                                </label>
                            </div>

                            {mode !== "crop" && (
                                <label className="block space-y-2">
                                    <span className="block text-sm font-semibold">
                                        Background color
                                    </span>
                                    <input
                                        type="color"
                                        value={backgroundColor}
                                        disabled={busy}
                                        onChange={(event) =>
                                            setBackgroundColor(event.target.value)
                                        }
                                        className="h-12 w-20 cursor-pointer rounded border border-zinc-300"
                                    />
                                </label>
                            )}

                            {mode === "crop" && (
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="block text-sm font-semibold">
                                            Horizontal crop position
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={positionX}
                                            disabled={busy}
                                            onChange={(event) =>
                                                setPositionX(Number(event.target.value))
                                            }
                                            className="w-full"
                                        />
                                        <span className="text-sm text-zinc-500">
                                            {Math.round(positionX * 100)}%
                                        </span>
                                    </label>

                                    <label className="space-y-2">
                                        <span className="block text-sm font-semibold">
                                            Vertical crop position
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={positionY}
                                            disabled={busy}
                                            onChange={(event) =>
                                                setPositionY(Number(event.target.value))
                                            }
                                            className="w-full"
                                        />
                                        <span className="text-sm text-zinc-500">
                                            {Math.round(positionY * 100)}%
                                        </span>
                                    </label>
                                </div>
                            )}

                            {busy && (
                                <div className="space-y-2" aria-live="polite">
                                    <div className="flex justify-between text-sm">
                                        <span>Exporting video...</span>
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
                                    onClick={exportVideo}
                                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Export video
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
                        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                            {error}
                        </p>
                    )}

                    {message && (
                        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700" aria-live="polite">
                            {message}
                        </p>
                    )}

                    {result && (
                        <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <h2 className="font-semibold">Export result</h2>

                            <video
                                src={result.url}
                                controls
                                className="max-h-80 w-full rounded-lg bg-black"
                            />

                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                <span className="break-all font-medium">{result.name}</span>
                                <span className="text-zinc-500">
                                    {result.type} · {formatBytes(result.size)}
                                </span>
                            </div>

                            <a
                                href={result.url}
                                download={result.name}
                                className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                            >
                                Download video
                            </a>
                        </div>
                    )}
                </section>

                <canvas ref={exportCanvasRef} className="hidden" />
            </section>
        </main>
    );
}
