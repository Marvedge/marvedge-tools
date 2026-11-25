"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { toolFaqs, type ToolFaq } from "@/lib/tool-faqs";

export function ToolFaqSection({ slug, toolName }: { slug: string; toolName: string }) {
  const faqs: ToolFaq[] = toolFaqs[slug] || [];
  const [openIndices, setOpenIndices] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);

  if (faqs.length === 0) return null;

  const displayedFaqs = showAll ? faqs : faqs.slice(0, 4);

  const toggle = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-5 py-12 sm:px-8">
      {/* Header */}
      <div className="mb-8 text-center sm:mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          FAQ
        </div>
        <h2 className="mt-2 font-serif text-2xl font-normal tracking-tight text-[#000000] sm:text-3xl lg:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 text-xs text-[#4A4740] sm:text-sm">
          Common questions about {toolName} formats, processing, and privacy.
        </p>
      </div>

      {/* Accordion List */}
      <div className="divide-y divide-[#D6CCB5]/70 border-y border-[#D6CCB5]/70">
        {displayedFaqs.map((faq, index) => {
          const isOpen = openIndices.includes(index);
          const panelId = `${slug}-faq-panel-${index}`;

          return (
            <div key={faq.q} className="group">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2]"
              >
                <span className="text-sm font-medium tracking-tight text-[#000000] transition-colors group-hover:text-[#537190] sm:text-base">
                  {faq.q}
                </span>

                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D6CCB5] bg-transparent text-[#000000] transition-all duration-200 ${
                    isOpen
                      ? "rotate-45 border-[#000000] bg-[#000000] text-[#FFFFFF]"
                      : "group-hover:border-[#7895B2]"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  className="pb-5 pr-8 text-xs leading-relaxed text-[#4A4740] sm:text-sm animate-fade-in"
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {faqs.length > 4 && !showAll && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D6CCB5] bg-white px-4 py-2 text-xs font-semibold text-black shadow-xs transition-colors hover:bg-[#FAF7F0] active:scale-95"
          >
            <span>Show all {faqs.length} questions</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
