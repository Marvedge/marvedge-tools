"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Wrench,
  ShieldCheck,
  Zap,
  Layers,
  Play,
  Scissors,
  QrCode,
  Mic,
  Infinity as InfinityIcon,
} from "lucide-react";
import { tools, MARVEDGE_URL } from "@/lib/tools";
import { MarvedgeCTA } from "@/components/MarvedgeCTA";
import { SiteHeader } from "@/components/SiteHeader";

/* Apple-Grade Dynamic Interactive Miniature for Tool #01: MP4 to GIF */
function Mp4ToGifMiniature() {
  const [timeStr, setTimeStr] = useState("01.2");
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    let animId: number;
    const duration = 2400; // 2.4s synchronized with CSS playhead
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) % duration;
      const progress = elapsed / duration;
      const current = 1.2 + progress * 3.0;
      setTimeStr(current.toFixed(1).padStart(4, "0"));
      setIsLooping(progress > 0.82 && progress < 0.94);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#E8DFCA] bg-[#FAF7F0] p-3 shadow-inner transition-all duration-300 group-hover:border-[#7895B2]/60 group-hover:bg-[#F5F0E6]">
      {/* Top telemetry & trim markers */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5 font-medium text-black">
          <Scissors className="h-3 w-3 text-[#7895B2] transition-transform duration-200 group-hover:rotate-12" />
          <span className="text-black/50">Trim:</span>
          <span className="font-semibold text-black">00:01.2</span>
          <span className="text-black/30">→</span>
          <span className="font-semibold text-black">00:04.2</span>
        </div>

        {/* Dynamic GIF ∞ loop indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight transition-all duration-200 ${
              isLooping
                ? "bg-[#000000] text-white shadow-sm scale-105"
                : "bg-[#7895B2]/20 text-[#7895B2]"
            }`}
          >
            <InfinityIcon className="h-3 w-3" />
            <span>GIF LOOP</span>
          </span>
          <span className="rounded bg-[#E8DFCA] px-1.5 py-0.5 text-[10px] font-bold text-black/70">
            15 FPS
          </span>
        </div>
      </div>

      {/* Filmstrip & Precision Scrubber Window */}
      <div className="relative h-12 w-full select-none overflow-hidden rounded-xl border border-[#D6CCB5] bg-[#000000] p-0.5 shadow-sm">
        {/* Film sprocket top perforations */}
        <div className="absolute inset-x-0 top-0 z-10 flex justify-between px-1.5 py-0.5 pointer-events-none opacity-40">
          {[...Array(14)].map((_, i) => (
            <span key={i} className="h-1 w-1.5 rounded-[1px] bg-white/70" />
          ))}
        </div>
        {/* Film sprocket bottom perforations */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-between px-1.5 py-0.5 pointer-events-none opacity-40">
          {[...Array(14)].map((_, i) => (
            <span key={i} className="h-1 w-1.5 rounded-[1px] bg-white/70" />
          ))}
        </div>

        {/* Video Frames Sequence */}
        <div className="flex h-full w-full items-center gap-1 px-1">
          <div className="relative h-full flex-1 overflow-hidden rounded bg-[#1A1A1A] flex items-center justify-center opacity-30">
            <div className="h-3 w-3 rounded-full bg-[#7895B2]/50 blur-[1px]" />
          </div>
          <div className="relative h-full flex-1 overflow-hidden rounded bg-gradient-to-br from-[#24292E] to-[#14171A] flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-[#7895B2] shadow-[0_0_8px_rgba(120,149,178,0.6)]" />
          </div>
          <div className="relative h-full flex-1 overflow-hidden rounded bg-gradient-to-br from-[#1E252B] to-[#0E1114] flex items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-[#7895B2] to-[#AEBDCA] shadow-[0_0_10px_rgba(174,189,202,0.8)]" />
          </div>
          <div className="relative h-full flex-1 overflow-hidden rounded bg-gradient-to-br from-[#24292E] to-[#14171A] flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-[#7895B2] shadow-[0_0_8px_rgba(120,149,178,0.6)]" />
          </div>
          <div className="relative h-full flex-1 overflow-hidden rounded bg-[#1A1A1A] flex items-center justify-center opacity-30">
            <div className="h-3 w-3 rounded-full bg-[#7895B2]/40 blur-[1px]" />
          </div>
        </div>

        {/* Trim Bracket Overlay */}
        <div className="pointer-events-none absolute inset-y-0 left-[14%] right-[18%] rounded border-2 border-[#7895B2] bg-[#7895B2]/10 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
          <div className="absolute -left-1 inset-y-0 w-2 rounded-l bg-[#7895B2] flex items-center justify-center">
            <div className="h-3 w-0.5 rounded-full bg-white/80" />
          </div>
          <div className="absolute -right-1 inset-y-0 w-2 rounded-r bg-[#7895B2] flex items-center justify-center">
            <div className="h-3 w-0.5 rounded-full bg-white/80" />
          </div>
        </div>
      </div>

      {/* Bottom Live Micro-Timecode & Output Specs */}
      <div className="flex items-center justify-between text-[10px] font-mono text-black/60">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-black">00:{timeStr}s</span>
          <span className="text-black/40">/ 00:06.0s</span>
        </div>

        <div className="flex items-center gap-1 font-medium text-black/70">
          <span className="text-black/40">MP4</span>
          <span>→</span>
          <span className="font-bold text-black">GIF 480p</span>
        </div>
      </div>
    </div>
  );
}

/* Helper to render visual interactive miniatures for each of the 19 tools */
function ToolVisualPreview({ slug }: { slug: string }) {
  switch (slug) {
    case "mp4-to-gif":
      return <Mp4ToGifMiniature />;

    case "image-compressor":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-black/50">Before / After</div>
            <div className="flex items-baseline gap-2 font-mono text-xs">
              <span className="text-black/40 line-through">4.8 MB</span>
              <span className="font-bold text-black">680 KB</span>
            </div>
          </div>
          <span className="rounded-full bg-[#000000] px-2.5 py-1 text-[11px] font-bold text-white">
            -86% Saved
          </span>
        </div>
      );

    case "qr-code-generator":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000000] text-white">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-black">Print Sheet Ready</div>
              <div className="text-[11px] text-black/60 font-mono">35mm × 35mm · A4</div>
            </div>
          </div>
          <span className="rounded-md border border-[#D6CCB5] bg-white px-2 py-0.5 text-[10px] font-mono text-black">
            SVG / PNG
          </span>
        </div>
      );

    case "video-compressor":
      return (
        <div className="flex flex-col gap-2 rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-black/60">Target: Slack / Web</span>
            <span className="font-bold text-[#7895B2]">25 MB Limit</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8DFCA]">
            <div className="h-full w-2/3 rounded-full bg-[#000000]" />
          </div>
        </div>
      );

    case "gif-compressor":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-zinc-200 border border-[#AEBDCA]" />
            <span className="text-xs font-medium text-black">Delta Optimization</span>
          </div>
          <span className="font-mono text-xs font-semibold text-[#7895B2]">128 Colors</span>
        </div>
      );

    case "image-resizer":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex gap-1.5 text-[11px] font-mono text-black">
            <span className="rounded-md bg-white border border-[#D6CCB5] px-2 py-0.5">1:1 Square</span>
            <span className="rounded-md bg-[#E8DFCA] px-2 py-0.5">16:9 Wide</span>
          </div>
          <span className="text-[11px] text-black/60 font-mono">Aspect Locked</span>
        </div>
      );

    case "image-format-converter":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-[#E8DFCA] px-1.5 py-0.5 font-bold">PNG</span>
            <span className="text-black/40">→</span>
            <span className="rounded bg-[#000000] px-1.5 py-0.5 font-bold text-white">WebP</span>
          </div>
          <span className="text-[11px] font-medium text-black/60">Alpha Intact</span>
        </div>
      );

    case "pdf-merger":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex -space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D6CCB5] bg-white text-[10px] font-bold shadow-sm">1</div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D6CCB5] bg-white text-[10px] font-bold shadow-sm">2</div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#000000] bg-[#000000] text-[10px] font-bold text-white shadow-sm">+</div>
          </div>
          <span className="text-[11px] font-medium text-black/70">Reorder & Merge</span>
        </div>
      );

    case "favicon-generator":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#000000] text-[10px] font-bold text-white">
              M
            </div>
            <div className="text-[11px] font-mono text-black/70">favicon.ico</div>
          </div>
          <div className="flex gap-1 text-[10px] font-mono text-black/50">
            <span>16×16</span>
            <span>·</span>
            <span>32×32</span>
          </div>
        </div>
      );

    case "video-aspect-ratio":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-black/60">16:9</span>
            <span className="text-black/40">→</span>
            <span className="rounded bg-[#7895B2] px-2 py-0.5 font-bold text-white">9:16 Vertical</span>
          </div>
          <span className="text-[11px] text-black/60">Smart Blur Fill</span>
        </div>
      );

    case "link-shortener":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <span className="font-mono text-xs font-semibold text-black">marvedge.com/go/launch</span>
          <span className="rounded-full bg-[#E8DFCA] px-2 py-0.5 text-[10px] font-mono font-medium text-black/70">
            7 Days Left
          </span>
        </div>
      );

    case "video-summarizer":
      return (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2 text-[11px] font-mono text-black/70">
            <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">00:42</span>
            <span>Feature overview & navigation</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-black/70">
            <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">02:15</span>
            <span>Interactive hotspots breakdown</span>
          </div>
        </div>
      );

    case "subtitle-generator":
      return (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="rounded-lg bg-[#000000] px-3 py-1.5 text-center text-xs font-medium text-white">
            &ldquo;Watch it click right here.&rdquo;
          </div>
          <div className="flex justify-between text-[10px] font-mono text-black/50 px-1">
            <span>00:03.120 → 00:05.400</span>
            <span>SRT / VTT</span>
          </div>
        </div>
      );

    case "youtube-title-generator":
      return (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center justify-between text-xs font-medium text-black">
            <span>&ldquo;We Built an Interactive Screen Demo in 30s&rdquo;</span>
            <span className="font-mono text-[10px] font-bold text-[#7895B2]">96%</span>
          </div>
          <span className="text-[10px] text-black/50">High-CTR Hook + SEO Description</span>
        </div>
      );

    case "content-repurposer":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-white border border-[#D6CCB5] px-2 py-0.5 text-[11px] font-medium text-black">LinkedIn</span>
            <span className="rounded-md bg-white border border-[#D6CCB5] px-2 py-0.5 text-[11px] font-medium text-black">X Thread</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-[#7895B2]">1 → 4 Formats</span>
        </div>
      );

    case "product-description-generator":
      return (
        <div className="flex flex-col gap-1 rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="text-xs font-semibold text-black">Benefit-Led Narrative</div>
          <div className="text-[11px] text-black/60 line-clamp-1">&ldquo;Turn quiet screen taps into engaging product stories...&rdquo;</div>
        </div>
      );

    case "screenshot-to-guide":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#000000] text-[10px] font-bold text-white">1</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#000000] text-[10px] font-bold text-white">2</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#000000] text-[10px] font-bold text-white">3</span>
          </div>
          <span className="text-xs font-medium text-black/70">SOP & Tutorial Export</span>
        </div>
      );

    case "voiceover-generator":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#7895B2]" />
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 bg-[#7895B2] h-2 rounded-full" />
              <span className="w-1 bg-[#7895B2] h-4 rounded-full" />
              <span className="w-1 bg-[#7895B2] h-3 rounded-full" />
              <span className="w-1 bg-[#7895B2] h-1 rounded-full" />
            </div>
          </div>
          <span className="rounded-full bg-white border border-[#D6CCB5] px-2 py-0.5 text-[10px] font-mono text-black">
            Studio Voice · 48kHz
          </span>
        </div>
      );

    case "demo-script-generator":
      return (
        <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-3.5 border border-[#E8DFCA]">
          <div className="flex gap-1.5 text-[11px] font-mono">
            <span className="text-black/60">Hook</span>
            <span className="text-black/30">→</span>
            <span className="text-black/60">Walkthrough</span>
            <span className="text-black/30">→</span>
            <span className="font-bold text-[#7895B2]">CTA</span>
          </div>
          <span className="text-[10px] text-black/50">3-Act Beat</span>
        </div>
      );

    default:
      return null;
  }
}

export default function Home() {
  const [filter, setFilter] = useState<"all" | "Free utility" | "AI tool">("all");
  const [activeAspect, setActiveAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");

  const filteredTools = tools.filter((t) => {
    if (filter === "all") return true;
    return t.category === filter;
  });

  return (
    <div className="min-h-screen bg-[#E8DFCA] text-[#000000]">
      {/* Top Header */}
      <SiteHeader />

      {/* 1. HERO SECTION (APPLE MINIMAL EDITORIAL) */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {/* Eyebrow Pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6CCB5] bg-[#FFFFFF] px-3.5 py-1 text-xs font-medium text-[#000000] shadow-xs">
              <img src="/marvedge-logo.png" alt="" className="h-3.5 w-auto object-contain" />
              <span>19 client-side media utilities</span>
            </div>
          </div>

          {/* Editorial Display Heading */}
          <div className="mx-auto mt-6 max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-normal leading-[1.08] tracking-tight text-[#000000] sm:text-6xl md:text-7xl">
              Fast media tools, right in your browser.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#2D2A26] sm:text-lg font-normal">
              Trim clips, compress images, convert formats, and draft scripts. Files process locally in memory with no upload wait.
            </p>

            {/* Action Group */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="#tools" className="btn-pure-black text-xs sm:text-sm py-2.5 px-5">
                Browse tools
                <ArrowRight className="h-3.5 w-3.5" />
              </a>

              <a
                href={MARVEDGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-warm-sand text-xs sm:text-sm py-2.5 px-5"
              >
                Open Marvedge
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* 2. INTERACTIVE STUDIO CANVAS SHOWCASE */}
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="overflow-hidden rounded-[2rem] border border-[#D6CCB5] bg-[#000000] p-4 shadow-xl sm:p-7">
              {/* Top Viewport Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#D95338]" />
                  <span className="h-3 w-3 rounded-full bg-[#7895B2]" />
                  <span className="h-3 w-3 rounded-full bg-white/20" />
                  <span className="ml-3 hidden text-xs font-mono text-white/50 sm:inline-block">
                    Preview player
                  </span>
                </div>

                {/* Aspect Ratio Switcher */}
                <div className="flex items-center rounded-full bg-white/10 p-1 text-xs">
                  {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setActiveAspect(ratio)}
                      className={`rounded-full px-3 py-1 font-mono transition-all duration-200 cursor-pointer ${
                        activeAspect === ratio
                          ? "bg-[#FFFFFF] text-[#000000] font-bold shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Viewport Canvas Screen */}
              <div className="relative mt-6 flex min-h-[260px] sm:min-h-[340px] items-center justify-center rounded-2xl bg-[#0F0F0F] p-6 transition-all duration-300">
                <div
                  className={`relative flex flex-col justify-between rounded-xl border-2 border-[#7895B2] bg-[#1A1A1A] p-4 shadow-xl transition-all duration-300 ${
                    activeAspect === "16:9"
                      ? "h-[220px] w-full max-w-[420px] sm:h-[260px] sm:max-w-[480px]"
                      : activeAspect === "9:16"
                      ? "h-[250px] w-[150px] sm:h-[300px] sm:w-[180px]"
                      : "h-[190px] w-[190px] sm:h-[240px] sm:w-[240px]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span className="rounded bg-[#7895B2] px-1.5 py-0.5 font-bold text-white">
                      AUTO-CROP
                    </span>
                    <span className="font-mono text-[#AEBDCA]">Target 00:03.00</span>
                  </div>

                  <div className="relative my-auto flex h-20 items-center justify-center rounded-lg border border-dashed border-[#AEBDCA]/40 bg-white/5">
                    <span className="text-xs font-medium text-white/80">Interactive Focal Subject</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                    <span>1080p · 60fps</span>
                    <span>Wasm · 0ms delay</span>
                  </div>
                </div>
              </div>

              {/* Scrubber & Telemetry Controller */}
              <div className="mt-5 flex flex-col gap-3 rounded-xl bg-white/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFFFFF] text-black">
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  </div>
                  <div className="text-xs font-mono tabular-nums text-white/90">
                    00:01.45 <span className="text-white/40">/ 00:03.00</span>
                  </div>
                </div>

                <div className="relative h-2 flex-1 mx-3 rounded-full bg-white/10">
                  <div className="h-full w-1/2 rounded-full bg-[#7895B2]" />
                </div>

                <span className="text-xs font-mono text-[#AEBDCA]">
                  Local render
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY FILTER & TOOL CATALOG */}
      <section id="tools" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[#D6CCB5] pb-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold text-black/60">
              Tool catalog
            </span>
            <h2 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#000000] sm:text-4xl">
              All 19 utilities.
            </h2>
          </div>

          {/* Segmented Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-[#D6CCB5] bg-[#FFFFFF] p-1 shadow-xs">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  filter === "all"
                    ? "bg-[#000000] text-[#FFFFFF]"
                    : "text-[#000000]/70 hover:text-[#000000]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("Free utility")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  filter === "Free utility"
                    ? "bg-[#000000] text-[#FFFFFF]"
                    : "text-[#000000]/70 hover:text-[#000000]"
                }`}
              >
                Free utilities
              </button>
              <button
                onClick={() => setFilter("AI tool")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  filter === "AI tool"
                    ? "bg-[#000000] text-[#FFFFFF]"
                    : "text-[#000000]/70 hover:text-[#000000]"
                }`}
              >
                AI studio
              </button>
            </div>
          </div>
        </div>

        {/* 4. BENTO GRID OF 19 TOOLS */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((t) => {
            const toolNumber = String(tools.indexOf(t) + 1).padStart(2, "0");
            const isAI = t.category === "AI tool";

            return (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-[#7895B2] hover:shadow-md active:scale-[0.99]"
              >
                <div>
                  {/* Card Header: Number & Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#000000]/40 group-hover:text-black">
                      #{toolNumber}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isAI
                          ? "bg-[#7895B2]/15 text-[#7895B2]"
                          : "bg-[#E8DFCA] text-[#000000]/80"
                      }`}
                    >
                      {isAI ? <Sparkles className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                      <span>{t.category}</span>
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="mt-3.5 text-xl font-bold tracking-tight text-[#000000]">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#000000]/70">
                    {t.tagline}
                  </p>

                  {/* Visual Miniature Section */}
                  <div className="mt-4">
                    <ToolVisualPreview slug={t.slug} />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 flex items-center justify-between border-t border-[#E8DFCA] pt-3.5 text-xs font-semibold text-[#000000]">
                  <span className="text-[#000000]/60 group-hover:text-[#000000]">
                    Open tool
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8DFCA] text-black transition-colors duration-150 group-hover:bg-[#000000] group-hover:text-white">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. ARCHITECTURE & PRIVACY */}
      <section className="border-t border-[#D6CCB5] bg-[#E8DFCA]/60 py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold text-black/60">
              Architecture
            </span>
            <h2 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#000000] sm:text-4xl">
              Browser-first media processing.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#000000] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-[#000000]">
                Client-side privacy
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#000000]/70">
                Media files process in WebAssembly and memory. Your videos, audio, and images never upload to a server.
              </p>
            </div>

            <div className="rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#000000] text-white">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-[#000000]">
                Zero upload waiting
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#000000]/70">
                Trimming, resizing, and compression begin the moment you drop a file. No upload bars or queue times.
              </p>
            </div>

            <div className="rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#000000] text-white">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-[#000000]">
                Connected to Marvedge
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#000000]/70">
                Turn static screen recordings into clickable product walkthroughs with auto-zoom and captions in Marvedge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FLAGSHIP CONVERSION BANNER */}
      <MarvedgeCTA context="Single-purpose utilities solve quick tasks." />
    </div>
  );
}
