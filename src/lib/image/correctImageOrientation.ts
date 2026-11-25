/**
 * Copy an already EXIF-oriented ImageBitmap into canvas pixels.
 *
 * `decodeImage()` applies EXIF orientation during decoding using
 * `imageOrientation: "from-image"`. This function materializes the corrected
 * visual orientation into raw canvas pixels so later crop/resize/export operations
 * don't depend on or re-apply original EXIF metadata.
 *
 * By materializing the pixels into an HTMLCanvasElement without EXIF tags,
 * subsequent downstream tools (compressor, resizer, converter) will not rotate
 * the bitmap again, preventing the double-rotation bug.
 *
 * Both portrait (height > width), landscape (width > height), and square images
 * are preserved at their decoded dimensions.
 */
export function correctImageOrientation(image: ImageBitmap): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("Image orientation correction requires a browser document.");
  }

  if (
    !image ||
    !Number.isSafeInteger(image.width) ||
    !Number.isSafeInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    throw new TypeError("A decoded image with valid dimensions is required.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("The browser could not create a 2D canvas context.");
  }

  try {
    context.drawImage(image, 0, 0);
  } catch {
    throw new Error("The decoded image could not be copied to the canvas.");
  }

  return canvas;
}
