// Sample files bundled with the app so every tool can be tried instantly.
// These are generated placeholders (not real customer media).
const photoUrl = "/samples/photo.jpg";
const portraitUrl = "/samples/portrait.jpg";
const logoUrl = "/samples/logo.png";
const clipUrl = "/samples/clip.webm";
const gifUrl = "/samples/animation.gif";
const narrationUrl = "/samples/narration.mp3";
const screen1 = "/samples/screen-1.png";
const screen2 = "/samples/screen-2.png";
const screen3 = "/samples/screen-3.png";

export type SampleKind = "photo" | "portrait" | "logo" | "clip" | "gif" | "narration";

const ASSETS: Record<SampleKind, { url: string; name: string; type: string }> = {
  photo: { url: photoUrl, name: "product-photo.jpg", type: "image/jpeg" },
  portrait: { url: portraitUrl, name: "passport-photo.jpg", type: "image/jpeg" },
  logo: { url: logoUrl, name: "marvedge-logo.png", type: "image/png" },
  clip: { url: clipUrl, name: "product-walkthrough.webm", type: "video/webm" },
  gif: { url: gifUrl, name: "loop.gif", type: "image/gif" },
  narration: { url: narrationUrl, name: "narration.mp3", type: "audio/mpeg" },
};

async function toFile(url: string, name: string, type: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the sample file.");
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || type });
}

export function loadSample(kind: SampleKind) {
  const a = ASSETS[kind];
  return toFile(a.url, a.name, a.type);
}

/** Three mock app screens, in order, for the screenshot-to-guide tool. */
export function loadScreens() {
  return Promise.all([screen1, screen2, screen3].map((url, i) => toFile(url, `screen-${i + 1}.png`, "image/png")));
}
