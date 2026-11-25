export type SupportedCanvasOutputType = "image/png" | "image/jpeg" | "image/webp";

export interface CanvasToBlobOptions {
  /** Target MIME format. Defaults to "image/png". */
  type?: SupportedCanvasOutputType;
  /** Used by JPEG and WebP encoders. Must be between 0 and 1. */
  quality?: number;
  /**
   * Background color to fill behind transparent pixels.
   * For "image/jpeg" (which lacks an alpha channel), defaults to "#ffffff" to
   * prevent browsers from rendering transparent areas as solid black.
   * Must be an opaque color when exporting to JPEG.
   * Set to null to disable background compositing.
   */
  backgroundColor?: string | null;
}

// Set of standard CSS Level 4 opaque named colors
const NAMED_OPAQUE_COLORS = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige",
  "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown",
  "burlywood", "cadetblue", "chartreuse", "chocolate", "coral",
  "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan",
  "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred",
  "darksalmon", "darkseagreen", "darkslateblue", "darkslategray",
  "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
  "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite",
  "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod",
  "gray", "green", "greenyellow", "grey", "honeydew", "hotpink",
  "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush",
  "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
  "lightpink", "lightsalmon", "lightseagreen", "lightskyblue",
  "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow",
  "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine",
  "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen",
  "mediumslateblue", "mediumspringgreen", "mediumturquoise",
  "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
  "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange",
  "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise",
  "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum",
  "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue",
  "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna",
  "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow",
  "springgreen", "steelblue", "tan", "teal", "thistle", "tomato",
  "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
  "yellowgreen",
]);

interface ParsedColor {
  isValid: boolean;
  isOpaque: boolean;
}

/**
 * Validate CSS color syntax and check whether the color is 100% opaque.
 */
function parseCssColor(color: string): ParsedColor {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, isOpaque: false };
  }

  if (trimmed === "transparent") {
    return { isValid: true, isOpaque: false };
  }

  if (NAMED_OPAQUE_COLORS.has(trimmed)) {
    return { isValid: true, isOpaque: true };
  }

  // Hex colors: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (/^[0-9a-f]{3}$/.test(hex)) {
      return { isValid: true, isOpaque: true };
    }
    if (/^[0-9a-f]{6}$/.test(hex)) {
      return { isValid: true, isOpaque: true };
    }
    if (/^[0-9a-f]{4}$/.test(hex)) {
      const alphaChar = hex[3];
      return { isValid: true, isOpaque: alphaChar === "f" };
    }
    if (/^[0-9a-f]{8}$/.test(hex)) {
      const alphaHex = hex.slice(6, 8);
      return { isValid: true, isOpaque: alphaHex === "ff" };
    }
    return { isValid: false, isOpaque: false };
  }

  // rgb(...) / rgba(...)
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/
  );
  if (rgbMatch) {
    const alphaStr = rgbMatch[4];
    if (alphaStr === undefined) {
      return { isValid: true, isOpaque: true };
    }
    const alpha = alphaStr.endsWith("%")
      ? parseFloat(alphaStr) / 100
      : parseFloat(alphaStr);
    return { isValid: !Number.isNaN(alpha), isOpaque: alpha >= 1 };
  }

  // hsl(...) / hsla(...)
  const hslMatch = trimmed.match(
    /^hsla?\(\s*([0-9.]+(?:deg|rad|turn)?)\s*[, ]\s*([0-9.]+%)\s*[, ]\s*([0-9.]+%)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/
  );
  if (hslMatch) {
    const alphaStr = hslMatch[4];
    if (alphaStr === undefined) {
      return { isValid: true, isOpaque: true };
    }
    const alpha = alphaStr.endsWith("%")
      ? parseFloat(alphaStr) / 100
      : parseFloat(alphaStr);
    return { isValid: !Number.isNaN(alpha), isOpaque: alpha >= 1 };
  }

  return { isValid: false, isOpaque: false };
}

/**
 * Validate a background color string, checking syntax and optionally requiring opacity.
 */
function validateBackgroundColor(color: string, requireOpaque: boolean): void {
  if (typeof color !== "string" || !color.trim()) {
    throw new TypeError("Invalid backgroundColor: color must be a non-empty string.");
  }

  const { isValid, isOpaque } = parseCssColor(color);
  if (!isValid) {
    throw new TypeError(`Invalid backgroundColor: '${color}' is not a valid CSS color.`);
  }

  if (requireOpaque && !isOpaque) {
    throw new Error(
      `Invalid backgroundColor: '${color}' is not opaque. JPEG background compositing requires an opaque color to prevent transparent pixels from rendering as black.`
    );
  }
}

/**
 * Composite a canvas onto a solid background color.
 * Used when exporting transparent canvases to formats that lack alpha support
 * (such as JPEG), or when the user explicitly requests background flattening.
 * Throws a descriptive error if compositing cannot be performed so that unflattened
 * transparent pixels are never silently exported to JPEG.
 */
function compositeOnBackground(
  sourceCanvas: HTMLCanvasElement,
  backgroundColor: string,
): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("Canvas background compositing requires a browser document.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The browser could not create a 2D canvas context for background compositing.");
  }

  try {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sourceCanvas, 0, 0);
  } catch {
    throw new Error("The browser failed to draw the image onto the composited canvas background.");
  }

  return canvas;
}

/** Export canvas pixels as a Blob without creating a large base64 data URL. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: CanvasToBlobOptions = {},
): Promise<Blob> {
  if (
    !canvas ||
    !Number.isSafeInteger(canvas.width) ||
    !Number.isSafeInteger(canvas.height) ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    return Promise.reject(new TypeError("A canvas with non-zero dimensions is required."));
  }

  const type = options.type ?? "image/png";
  if (type !== "image/png" && type !== "image/jpeg" && type !== "image/webp") {
    return Promise.reject(new TypeError(`Unsupported canvas output type: ${type}`));
  }

  const quality = options.quality;
  if (quality !== undefined && (!Number.isFinite(quality) || quality < 0 || quality > 1)) {
    return Promise.reject(new RangeError("quality must be a number between 0 and 1."));
  }

  if (typeof canvas.toBlob !== "function") {
    return Promise.reject(new Error("This browser does not support canvas.toBlob()."));
  }

  // Handle transparency flattening:
  // JPEG does not support transparency; standard browsers render transparent pixels as black.
  // We flatten transparency onto a white background by default for JPEG, or onto the custom color.
  // JPEG compositing requires an opaque background.
  // If compositing fails, we propagate the error rather than silently exporting the unflattened canvas.
  let targetCanvas: HTMLCanvasElement = canvas;
  try {
    if (type === "image/jpeg" && options.backgroundColor !== null) {
      const bgColor = options.backgroundColor ?? "#ffffff";
      validateBackgroundColor(bgColor, true);
      targetCanvas = compositeOnBackground(canvas, bgColor);
    } else if (options.backgroundColor) {
      validateBackgroundColor(options.backgroundColor, false);
      targetCanvas = compositeOnBackground(canvas, options.backgroundColor);
    }
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }

  if (typeof targetCanvas.toBlob !== "function") {
    return Promise.reject(new Error("This browser does not support canvas.toBlob()."));
  }

  return new Promise((resolve, reject) => {
    try {
      targetCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("The browser failed to export the canvas."));
            return;
          }

          // Unsupported requested encoders silently fall back to PNG in standard browser engines.
          if (blob.type.toLowerCase() !== type) {
            reject(new Error(`This browser does not support exporting ${type}.`));
            return;
          }

          resolve(blob);
        },
        type,
        quality,
      );
    } catch {
      reject(new Error("The browser failed to export the canvas. Check that it is not tainted by cross-origin content."));
    }
  });
}
