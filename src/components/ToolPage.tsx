"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { getTool, MARVEDGE_URL, type Tool } from "@/lib/tools";
import { getToolSeo } from "@/lib/tool-seo";
import { ToolWorkspace } from "@/components/tools/registry";
import { ToolEditorialSections } from "./ToolSections";
import { ToolFaqSection } from "./ToolFaq";

export function ToolPage({ tool }: { tool: Tool }) {
  const seo = getToolSeo(tool.slug);

  return (
    <div className="min-h-screen bg-[#E8DFCA] text-[#000000]">
      {/* 1. HEADER & INTERACTIVE TOOL WORKSPACE */}
      <section className="mx-auto max-w-7xl px-5 pt-8 pb-6 sm:px-8 sm:pt-10">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#4A4740]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-medium text-[#000000] transition-colors hover:text-[#537190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              All tools
            </Link>
            <span className="text-[#D6CCB5]" aria-hidden="true">
              /
            </span>
            <span>{tool.category}</span>
          </div>

          <h1 className="font-serif text-4xl font-normal leading-tight tracking-tight text-[#000000] sm:text-5xl md:text-6xl">
            {tool.name}
          </h1>

          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#4A4740] sm:text-lg">
            {tool.tagline}
          </p>
        </div>

        {/* ACTUAL INTERACTIVE TOOL WORKSPACE */}
        <div className="rounded-3xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
          <ToolWorkspace slug={tool.slug} />
        </div>

        {/* DIRECT ANSWER SUMMARY & TRUST CHIPS (TAPLIO-STYLE) */}
        <div className="mt-8 rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 sm:p-7 shadow-xs">
          <p className="text-base sm:text-lg font-medium leading-relaxed text-[#000000]">
            {seo.definitionLead}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {seo.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-2 rounded-full border border-[#D6CCB5]/80 bg-[#FAF7F0] px-3.5 py-1.5 text-xs font-semibold text-[#000000] shadow-2xs"
              >
                <Check className="h-3.5 w-3.5 text-[#537190]" aria-hidden="true" />
                {cap}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D6CCB5]/80 bg-[#FAF7F0] px-3.5 py-1.5 text-xs font-semibold text-[#000000] shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              In-browser · No server upload
            </span>
          </div>
        </div>
      </section>

      {/* 2. EDITORIAL CONTENT SECTIONS (TAPLIO-STYLE STRUCTURE) */}
      <ToolEditorialSections seo={seo} tool={tool} />

      {/* 3. FREQUENTLY ASKED QUESTIONS */}
      <ToolFaqSection slug={tool.slug} toolName={tool.name} />

      {/* 4. CONVERSION BANNER & RELATED TOOLS */}
      <section className="mx-auto max-w-5xl px-5 pt-8 pb-16 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-white/10 bg-[#000000] p-8 text-[#FFFFFF] shadow-xl md:flex-row md:items-center md:p-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#AEBDCA]">
              Next step
            </div>
            <h2 className="mt-2 font-serif text-2xl font-normal tracking-tight text-[#FFFFFF] sm:text-3xl">
              Turn screen captures into interactive demos.
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[#AEBDCA]">
              Build clickable walkthroughs and product guides with Marvedge.
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <a
              href={MARVEDGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#FFFFFF] px-5 py-3 text-xs font-semibold text-[#000000] shadow-md transition-colors hover:bg-[#E8DFCA] active:scale-[0.98]"
            >
              Start free <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* RELATED TOOLS */}
        <div className="mt-12 border-t border-[#D6CCB5] pt-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
            Explore tools
          </div>
          <h2 className="mt-2 font-serif text-2xl font-normal tracking-tight text-[#000000]">
            Related tools
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tool.related.map((slug) => {
              const r = getTool(slug);
              return (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className="group rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-4 transition-colors hover:border-[#7895B2] shadow-xs"
                >
                  <p className="font-serif text-lg font-normal text-[#000000] group-hover:underline">
                    {r.name}
                  </p>
                  <p className="mt-1 text-xs text-[#4A4740]">{r.tagline}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
