export interface DownloadBlobOptions {
  /** Delay before revoking the temporary object URL in milliseconds. Defaults to 30,000 (30 seconds). */
  revokeAfterMs?: number;
}

const DEFAULT_REVOKE_DELAY_MS = 30_000;
const MAX_FILENAME_LENGTH = 180;
const INVALID_FILENAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * Remove path separators, control characters, and reserved Windows device names.
 * Ensures the extension is preserved even when truncating overly long filenames.
 */
export function sanitizeDownloadFilename(filename: string): string {
  if (typeof filename !== "string") {
    throw new TypeError("A download filename must be a string.");
  }

  let cleaned = filename
    .normalize("NFC")
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "download";
  }

  // If filename starts with a dot (e.g. ".png"), ensure it has a base name
  if (cleaned.startsWith(".")) {
    cleaned = `download${cleaned}`;
  }

  // Check reserved Windows device names (e.g. CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9)
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }

  // Truncate to MAX_FILENAME_LENGTH while preserving the file extension
  if (cleaned.length > MAX_FILENAME_LENGTH) {
    const lastDotIndex = cleaned.lastIndexOf(".");
    if (lastDotIndex > 0) {
      const ext = cleaned.slice(lastDotIndex);
      const maxBaseLength = Math.max(1, MAX_FILENAME_LENGTH - ext.length);
      const base = cleaned.slice(0, maxBaseLength).trim().replace(/[. ]+$/g, "");
      cleaned = `${base}${ext}`;
    } else {
      cleaned = cleaned.slice(0, MAX_FILENAME_LENGTH).trim().replace(/[. ]+$/g, "");
    }
  }

  return cleaned || "download";
}

/**
 * Trigger a browser download and safely revoke its temporary object URL afterwards.
 * The delay prevents revoking the URL before the browser download has initiated.
 * Ensures the object URL is revoked immediately on failure, revoked after delay on success,
 * and never revoked more than once.
 */
export function downloadBlob(
  blob: Blob,
  filename: string,
  options: DownloadBlobOptions = {},
): void {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    throw new Error("File downloads are only available in a browser.");
  }

  if (!blob || typeof blob.size !== "number" || typeof blob.slice !== "function") {
    throw new TypeError("Please provide a valid Blob to download.");
  }

  const safeFilename = sanitizeDownloadFilename(filename);
  const revokeAfterMs = options.revokeAfterMs ?? DEFAULT_REVOKE_DELAY_MS;
  if (!Number.isFinite(revokeAfterMs) || revokeAfterMs < 0) {
    throw new RangeError("revokeAfterMs must be a non-negative finite number.");
  }

  if (!document.body) {
    throw new Error("The document body is not available for downloading files.");
  }

  const objectUrl = URL.createObjectURL(blob);
  let isRevoked = false;
  const revokeUrl = () => {
    if (!isRevoked) {
      isRevoked = true;
      URL.revokeObjectURL(objectUrl);
    }
  };

  let anchor: HTMLAnchorElement | null = null;
  let downloadInitiated = false;

  try {
    anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safeFilename;
    anchor.rel = "noopener";
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();

    // Schedule delayed revocation after successful initiation
    setTimeout(revokeUrl, revokeAfterMs);
    downloadInitiated = true;
  } catch (error) {
    // Revoke immediately if anything fails prior to or during initiation
    revokeUrl();
    throw error;
  } finally {
    if (anchor && typeof anchor.remove === "function") {
      try {
        anchor.remove();
      } catch {
        // Prevent anchor removal errors from masking original errors or aborting revocation
      }
    }
    // Safety net: if download was not initiated and URL has not yet been revoked, revoke now
    if (!downloadInitiated) {
      revokeUrl();
    }
  }
}
