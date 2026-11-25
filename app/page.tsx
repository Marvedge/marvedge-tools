"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { tools } from "@/lib/tools";
import { MarvedgeCTA } from "@/components/MarvedgeCTA";

export default function Home() {
  const [filter, setFilter] = useState<"All" | "Free utility" | "AI tool">("All");
  const [search, setSearch] = useState("");

  const filtered = tools.filter((t) => {
    const matchesCategory = filter === "All" || t.category === filter;
    const matchesSearch =
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tagline.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#E8DFCA] text-black">
      {/* Navigation Header */}
      <header className="border-b border-[#D6CCB5] bg-[#E8DFCA]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif text-2xl font-bold tracking-tight text-black">
              Marvedge
            </span>
            <span className="rounded-full border border-[#D6CCB5] bg-[#FAF7F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#537190]">
              Tools
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#4A4740]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              100% In-Browser Privacy
            </span>
            <a
              href="https://marvedge.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/80 transition-colors"
            >
              Main Platform <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-5 pt-12 pb-8 sm:px-8 sm:pt-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D6CCB5] bg-[#FAF7F0] px-3.5 py-1 text-xs font-semibold text-[#537190] shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#7895B2]" />
            <span>Browser-Native &amp; Private Creator Utilities</span>
          </div>

          <h1 className="mt-4 font-serif text-4xl font-normal leading-tight tracking-tight text-black sm:text-6xl">
            Clean, focused tools for video and creators.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-[#4A4740] sm:text-xl">
            Trim video clips to lightweight GIFs, compress media, and format assets right inside your browser. No files are uploaded to any server.
          </p>

          {/* Featured Highlight Card: MP4 to GIF */}
          <div className="mt-8 rounded-3xl border border-[#D6CCB5] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 mb-2">
                  Featured Tool (Milestone T-00012)
                </span>
                <h2 className="font-serif text-2xl font-bold sm:text-3xl">
                  MP4 to GIF Converter
                </h2>
                <p className="mt-1 text-sm text-[#4A4740]">
                  Off-thread Web Worker NeuQuant palette quantization, looping preview, and instant cancellation.
                </p>
              </div>
              <Link
                href="/mp4-to-gif"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-black/80 transition-colors shrink-0"
              >
                <span>Open MP4 to GIF</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6CCB5] pb-6">
          <div className="flex items-center gap-2">
            {(["All", "Free utility", "AI tool"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  filter === cat
                    ? "bg-black text-white"
                    : "border border-[#D6CCB5] bg-[#FAF7F0] text-[#4A4740] hover:text-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-full border border-[#D6CCB5] bg-[#FAF7F0] px-4 py-2 text-xs text-black placeholder-[#4A4740]/60 focus:outline-none focus:ring-2 focus:ring-[#7895B2]"
            />
          </div>
        </div>

        {/* Tools Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <Link
              key={tool.slug}
              href={`/${tool.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-[#D6CCB5] bg-white p-6 shadow-xs transition-all hover:border-black hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[#D6CCB5]/80 bg-[#FAF7F0] px-2.5 py-0.5 text-[10px] font-semibold text-[#537190]">
                    {tool.category}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#4A4740] group-hover:text-black transition-colors" />
                </div>

                <h3 className="mt-3 font-serif text-xl font-normal text-black group-hover:underline">
                  {tool.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#4A4740]">
                  {tool.tagline}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tool.features.slice(0, 3).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded bg-[#FAF7F0] px-2 py-0.5 text-[10px] font-medium text-[#4A4740]"
                    >
                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#D6CCB5]/40 flex items-center justify-between text-xs font-semibold text-black">
                <span>Launch tool</span>
                <span className="text-[#537190]">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Marvedge CTA and Global Footer */}
      <MarvedgeCTA />
    </div>
  );
}
