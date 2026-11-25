/**
 * Marvedge Micro-SaaS — Shared Video Core File Prober
 *
 * Extracts video duration, dimensions, aspect ratio, and browser decoding
 * readiness using browser-native HTMLVideoElement APIs with strict timeout
 * protection and guaranteed Object URL cleanup.
 */

import type { VideoMetadata, ProbeOptions } from "./types";

/** Default timeout in milliseconds for reading video metadata */
export const DEFAULT_PROBE_TIMEOUT_MS = 6000;

/**
 * Probes an input video file or blob and extracts its essential metadata.
 *
 * Guaranteed resource safety:
 * - Creates a temporary object URL and revokes it immediately when finished, failed, or timed out.
 * - Detaches all DOM event listeners and resets the video element to prevent memory leaks.
 *
 * @param file - Input video File or Blob
 * @param options - Optional configuration (e.g., custom timeout)
 * @returns Promise resolving to a structured VideoMetadata object
 */
export function probeVideo(file: File | Blob, options?: ProbeOptions): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // 1. Validate File / Blob Input
    if (!file || !(file instanceof Blob)) {
      return reject(new Error("Invalid input: Expected a valid File or Blob."));
    }

    if (file.size === 0) {
      return reject(new Error("The selected file is empty (0 bytes)."));
    }

    const mime = file.type ? file.type.toLowerCase() : "";
    const fileName = "name" in file && typeof file.name === "string" ? file.name.toLowerCase() : "";

    // Early validation for unsupported non-video file types and MIME types
    if (mime.startsWith("image/")) {
      return reject(
        new Error(
          "Unsupported file type: Image files cannot be converted with the MP4 to GIF tool. Please select an MP4, MOV or WebM clip.",
        ),
      );
    }

    if (mime.startsWith("text/") || mime === "application/json") {
      return reject(
        new Error(
          "Unsupported file type: Text documents cannot be converted. Please select an MP4, MOV or WebM clip.",
        ),
      );
    }

    if (mime.startsWith("audio/")) {
      return reject(
        new Error(
          "Unsupported file type: Audio files contain no video track. Please select an MP4, MOV or WebM clip.",
        ),
      );
    }

    const nonVideoExtRegex =
      /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff|txt|md|json|csv|pdf|zip|tar|gz|exe|docx?|xlsx?)$/i;
    if (fileName && nonVideoExtRegex.test(fileName)) {
      return reject(
        new Error(
          `Unsupported file format: "${fileName}". Please select an MP4, MOV or WebM clip.`,
        ),
      );
    }

    const videoExtRegex = /\.(mp4|mov|webm|m4v|mkv|ogv|avi)$/i;
    if (
      mime &&
      !mime.startsWith("video/") &&
      mime !== "application/octet-stream" &&
      !videoExtRegex.test(fileName)
    ) {
      return reject(
        new Error(`Unsupported file type: "${mime}". Please select an MP4, MOV or WebM clip.`),
      );
    }

    const effectiveMime = mime || "video/mp4";

    // 2. Allocate Object URL
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (err) {
      return reject(
        new Error(
          `Failed to create object URL for video: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }

    // 3. Create Temporary Video Element
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isSettled = false;

    // 4. Guaranteed Resource Cleanup Handler
    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      video.onloadedmetadata = null;
      video.onerror = null;
      video.onstalled = null;
      video.removeAttribute("src");
      try {
        if (typeof video.load === "function") {
          video.load();
        }
      } catch {
        // Safe fallback for testing environments (e.g. JSDOM where HTMLMediaElement.load is unimplemented)
      }
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignore URL revocation errors during teardown
      }
    };

    // 5. Timeout Guard
    const timeoutMs = options?.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
    timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(
        new Error(
          `Video probe timed out after ${timeoutMs}ms. The file may be corrupt, incomplete, or unreadable.`,
        ),
      );
    }, timeoutMs);

    // 6. Metadata Event Handler
    video.onloadedmetadata = () => {
      if (isSettled) return;
      isSettled = true;

      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Validate decoded duration
      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup();
        return reject(
          new Error(
            "Unable to determine video duration. The file may be a live stream or corrupt.",
          ),
        );
      }

      // Validate decoded dimensions
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        cleanup();
        return reject(
          new Error(
            "Video contains no valid frame dimensions. The visual track may be missing or unreadable.",
          ),
        );
      }

      // Check browser playback support
      const canPlay = video.canPlayType(effectiveMime);
      const isPlayable = canPlay === "probably" || canPlay === "maybe" || video.readyState >= 1;

      // Detect potential HEVC or unsupported container flags from file name or MIME
      let codecWarning: string | undefined;
      const isHevcDetected =
        fileName.endsWith(".hevc") ||
        fileName.endsWith(".h265") ||
        effectiveMime.includes("hvc1") ||
        effectiveMime.includes("hev1");

      if (isHevcDetected) {
        codecWarning =
          "This file appears to use HEVC/H.265 compression. Playback and GIF conversion may fail on browsers without native hardware HEVC decoding.";
      }

      // Inspect audio presence where non-standard browser properties exist
      const anyVid = video as unknown as {
        audioTracks?: { length: number };
        mozHasAudio?: boolean;
        webkitAudioDecodedByteCount?: number;
      };
      let hasAudio: boolean | undefined = undefined;
      if (anyVid.audioTracks && typeof anyVid.audioTracks.length === "number") {
        hasAudio = anyVid.audioTracks.length > 0;
      } else if (typeof anyVid.mozHasAudio === "boolean") {
        hasAudio = anyVid.mozHasAudio;
      }

      const metadata: VideoMetadata = {
        duration: Number(duration.toFixed(3)),
        width,
        height,
        aspectRatio: Number((width / height).toFixed(4)),
        mimeType: effectiveMime,
        isPlayable,
      };

      if (hasAudio !== undefined) {
        metadata.hasAudio = hasAudio;
      }

      if (codecWarning !== undefined) {
        metadata.codecWarning = codecWarning;
      }

      cleanup();
      resolve(metadata);
    };

    // 7. Decode Error Handler
    video.onerror = () => {
      if (isSettled) return;
      isSettled = true;

      const mediaError = video.error;
      let message = "Could not decode video file.";

      if (mediaError) {
        // Standard HTML5 MediaError codes: 1 = ABORTED, 2 = NETWORK, 3 = DECODE, 4 = SRC_NOT_SUPPORTED
        switch (mediaError.code) {
          case 4:
            message = "Video format or codec is not supported by your browser.";
            break;
          case 3:
            message = "Video decoding failed. The media data may be corrupt.";
            break;
          case 2:
            message = "A network error occurred while loading the video.";
            break;
          case 1:
            message = "Video loading was aborted.";
            break;
        }
      }

      cleanup();
      reject(new Error(message));
    };

    // 8. Bind Source to Begin Decoding
    video.src = objectUrl;
  });
}
