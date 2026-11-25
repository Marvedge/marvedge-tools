"use client";

import { type ReactNode, lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";

// --- Lazy wrappers for named tool exports ---
const Mp4ToGif = lazy(() => import("./VideoTools").then((m) => ({ default: m.Mp4ToGif })));
const VideoCompressor = lazy(() => import("./VideoTools").then((m) => ({ default: m.VideoCompressor })));
const AspectRatio = lazy(() => import("./VideoTools").then((m) => ({ default: m.AspectRatio })));
const GifCompressor = lazy(() => import("./VideoTools").then((m) => ({ default: m.GifCompressor })));

const ImageCompressor = lazy(() => import("./ImageTools").then((m) => ({ default: m.ImageCompressor })));
const ImageResizer = lazy(() => import("./ImageTools").then((m) => ({ default: m.ImageResizer })));
const FormatConverter = lazy(() => import("./ImageTools").then((m) => ({ default: m.FormatConverter })));
const QrGenerator = lazy(() => import("./ImageTools").then((m) => ({ default: m.QrGenerator })));
const FaviconGenerator = lazy(() => import("./ImageTools").then((m) => ({ default: m.FaviconGenerator })));
const PdfTool = lazy(() => import("./ImageTools").then((m) => ({ default: m.PdfTool })));

const LinkShortener = lazy(() => import("./LinkShortener").then((m) => ({ default: m.LinkShortener })));

// Loading spinner shown while a tool chunk loads
function ToolFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
    </div>
  );
}

function AiToolPlaceholder({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D6CCB5] bg-[#FAF7F0] p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-sm">
        <Sparkles className="h-6 w-6 text-[#7895B2]" />
      </div>
      <h3 className="mt-4 font-serif text-2xl font-normal text-black">
        AI Studio Workflow
      </h3>
      <p className="mt-2 max-w-md text-sm text-[#4A4740]">
        This AI-powered tool ({slug}) connects to the Marvedge Cloud Engine for heavy background generation. Check out the client-side media utilities above!
      </p>
    </div>
  );
}

export function ToolWorkspace({ slug }: { slug: string }): ReactNode {
  const inner = (() => {
    switch (slug) {
      case "mp4-to-gif":
        return <Mp4ToGif />;
      case "image-compressor":
        return <ImageCompressor />;
      case "qr-code-generator":
        return <QrGenerator />;
      case "video-compressor":
        return <VideoCompressor />;
      case "gif-compressor":
        return <GifCompressor />;
      case "image-resizer":
        return <ImageResizer />;
      case "image-format-converter":
        return <FormatConverter />;
      case "pdf-merger":
        return <PdfTool />;
      case "favicon-generator":
        return <FaviconGenerator />;
      case "link-shortener":
        return <LinkShortener />;
      case "video-aspect-ratio":
        return <AspectRatio />;
      default:
        return <AiToolPlaceholder slug={slug} />;
    }
  })();

  return <Suspense fallback={<ToolFallback />}>{inner}</Suspense>;
}
