"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Play,
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowUp,
  Lock,
  X,
} from "lucide-react";
import { MARVEDGE_URL } from "@/lib/tools";

export function MarvedgeCTA({ context }: { context?: string }) {
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | "security" | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#000000] p-8 text-[#FFFFFF] shadow-2xl sm:p-14 lg:p-16">
          {/* Subtle structural ambient grid line */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-medium text-[#AEBDCA]">
                <Sparkles className="h-3.5 w-3.5 text-[#7895B2]" />
                <span>Marvedge platform</span>
              </div>

              <h2 className="mt-4 font-serif text-3xl font-normal leading-[1.12] tracking-tight text-[#FFFFFF] sm:text-5xl">
                Turn screen recordings into interactive product demos.
              </h2>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#AEBDCA] sm:text-lg">
                {context ?? "Single-purpose utilities solve quick tasks."} Marvedge turns raw screen recordings into interactive, click-through product demos with auto-zoom and voiceovers in 30 languages.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <a
                  href={MARVEDGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#FFFFFF] px-5 py-3 text-sm font-semibold text-[#000000] shadow-md transition-all duration-200 hover:bg-[#E8DFCA] active:scale-[0.98]"
                >
                  <span>Try Marvedge free</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>

                <a
                  href={MARVEDGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-medium text-[#FFFFFF] transition-colors hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
                >
                  <Play className="h-3.5 w-3.5 fill-current text-[#7895B2]" />
                  <span>Watch demo</span>
                </a>
              </div>
            </div>

            {/* Apple-style Interactive Screen Preview Mockup */}
            <div className="relative rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-[#AEBDCA]">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Interactive Walkthrough Studio</span>
                </div>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-mono">
                  Zero Upload
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-[#AEBDCA]">
                <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>100% In-Browser Media Processing Engine</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
                  <Cpu className="h-4 w-4 text-[#7895B2]" />
                  <span>Web Worker Multi-Threaded NeuQuant & LZW</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span>Private by Design — No Files Leave Your Machine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-[#D6CCB5] bg-[#FAF7F0] text-black">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight">
                <span>Marvedge</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#4A4740]">
                High-performance, privacy-first in-browser media utilities and interactive demo creator for modern builders.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7895B2]">
                Video & Media
              </h4>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/mp4-to-gif" className="text-[#4A4740] hover:text-black hover:underline">
                    MP4 to GIF Converter
                  </Link>
                </li>
                <li>
                  <Link href="/video-compressor" className="text-[#4A4740] hover:text-black hover:underline">
                    Video Compressor
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7895B2]">
                Platform & Privacy
              </h4>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => setLegalModal("privacy")}
                    className="text-[#4A4740] hover:text-black hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setLegalModal("terms")}
                    className="text-[#4A4740] hover:text-black hover:underline cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setLegalModal("security")}
                    className="text-[#4A4740] hover:text-black hover:underline cursor-pointer"
                  >
                    Security Architecture
                  </button>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-start sm:items-end justify-between">
              <button
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D6CCB5] bg-white px-3.5 py-1.5 text-xs font-medium text-black shadow-xs hover:border-black transition-colors cursor-pointer"
              >
                <span>Back to top</span>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-10 border-t border-[#D6CCB5]/60 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#4A4740] gap-4">
            <p>© 2026 Marvedge Inc. All rights reserved.</p>
            <p className="font-mono text-[11px]">
              Media files are processed locally in your browser memory and never uploaded to any server.
            </p>
          </div>
        </div>
      </footer>

      {/* Accessible Interactive Dialogs for Privacy, Terms, and Security */}
      {legalModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-w-xl max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 text-black sm:p-8 shadow-2xl">
            <button
              onClick={() => setLegalModal(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-black/60 hover:text-black hover:bg-black/5 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {legalModal === "privacy" && (
              <>
                <h3 className="font-serif text-2xl font-normal text-black">
                  Privacy Policy & Zero-Storage Guarantee
                </h3>
                <p className="text-xs font-mono text-black/60 mt-1">
                  Client-Side Confidentiality
                </p>
                <div className="mt-4 space-y-4 text-xs leading-relaxed text-black/80">
                  <div className="rounded-xl bg-[#FAF7F0] p-4 border border-[#E8DFCA]">
                    <h4 className="font-bold text-black text-sm">Core Privacy Guarantee</h4>
                    <p className="mt-1">
                      Your video, image, audio, and PDF files never leave your device. All utilities operate inside your local browser sandbox.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black">1. Zero Media Uploads</h4>
                    <p className="mt-1">
                      When you trim an MP4 or compress media, processing occurs on your device. No binary file data is transmitted to Marvedge servers.
                    </p>
                  </div>
                </div>
              </>
            )}

            {legalModal === "terms" && (
              <>
                <h3 className="font-serif text-2xl font-normal text-black">
                  Terms of Service
                </h3>
                <p className="text-xs font-mono text-black/60 mt-1">
                  Fair, Transparent Usage Guidelines
                </p>
                <div className="mt-4 space-y-4 text-xs leading-relaxed text-black/80">
                  <div className="rounded-xl bg-[#FAF7F0] p-4 border border-[#E8DFCA]">
                    <h4 className="font-bold text-black text-sm">Ownership & Rights</h4>
                    <p className="mt-1">
                      You retain 100% intellectual property, copyright, and commercial rights over all files produced with Marvedge Tools.
                    </p>
                  </div>
                </div>
              </>
            )}

            {legalModal === "security" && (
              <>
                <h3 className="font-serif text-2xl font-normal text-black">
                  Security Architecture
                </h3>
                <p className="text-xs font-mono text-black/60 mt-1">
                  Local Sandboxing & Cryptographic Safety
                </p>
                <div className="mt-4 space-y-4 text-xs leading-relaxed text-black/80">
                  <div className="rounded-xl bg-[#FAF7F0] p-4 border border-[#E8DFCA]">
                    <h4 className="font-bold text-black text-sm">Browser Sandbox Isolation</h4>
                    <p className="mt-1">
                      Every file operation is isolated within standard web worker threads. Memory allocations are de-allocated immediately upon completion.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
