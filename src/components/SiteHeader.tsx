"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X, ArrowUpRight, Wrench, Sparkles } from "lucide-react";
import { tools, MARVEDGE_URL } from "@/lib/tools";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8DFCA]";

function ToolDropdownContent({ onPick }: { onPick?: () => void }) {
  const utilities = tools.filter((t) => t.category === "Free utility");
  const aiTools = tools.filter((t) => t.category === "AI tool");

  return (
    <div className="grid gap-6 p-6 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#4A4740]">
          <Wrench className="h-3.5 w-3.5 text-[#537190]" aria-hidden="true" />
          <span>Free utilities</span>
        </div>
        <div className="space-y-1">
          {utilities.map((t) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              onClick={onPick}
              className="group flex items-center rounded-xl px-3 py-2 text-sm text-[#000000]/80 transition-colors duration-150 hover:bg-[#FAF7F0] hover:text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2]"
            >
              <span className="font-medium">{t.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#4A4740]">
          <Sparkles className="h-3.5 w-3.5 text-[#537190]" aria-hidden="true" />
          <span>AI studio</span>
        </div>
        <div className="space-y-1">
          {aiTools.map((t) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              onClick={onPick}
              className="group flex items-center rounded-xl px-3 py-2 text-sm text-[#000000]/80 transition-colors duration-150 hover:bg-[#FAF7F0] hover:text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2]"
            >
              <span className="font-medium">{t.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !mobile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobile(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, mobile]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#D6CCB5]/80 bg-[#E8DFCA]/90 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Brand Monogram & Title */}
        <Link
          href="/"
          className={`group flex items-center gap-3 rounded-full pr-1 transition-transform active:scale-[0.98] ${focusRing}`}
        >
          <img
            src="/marvedge-logo.png"
            alt="Marvedge Logo"
            className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold tracking-tight text-[#000000]">Marvedge</span>
            <span className="rounded-md bg-[#000000] px-2 py-0.5 text-xs font-bold tracking-wide text-[#FFFFFF] shadow-xs">
              Tools
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/"
            className={`rounded-full px-4 py-1.5 text-sm font-medium text-[#000000]/70 transition-colors hover:text-[#000000] ${focusRing}`}
          >
            Overview
          </Link>

          {/* All Tools Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((prev) => !prev)}
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-[#000000]/80 transition-colors hover:bg-[#D6CCB5]/40 hover:text-[#000000] ${focusRing}`}
            >
              <span>Tools</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 text-black/60 transition-transform duration-200 ${
                  open ? "rotate-180 text-black" : ""
                }`}
              />
            </button>

            {open && (
              <div className="absolute left-1/2 top-full w-[640px] -translate-x-1/2 pt-2">
                <div className="overflow-hidden rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] shadow-2xl">
                  <ToolDropdownContent onPick={() => setOpen(false)} />
                  <div className="flex items-center justify-between border-t border-[#E8DFCA] bg-[#FAF7F0] px-6 py-3 text-xs text-[#4A4740]">
                    <span>Privacy First: All free tools run directly in your browser.</span>
                    <a
                      href={MARVEDGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded font-semibold text-[#537190] transition-colors hover:text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7895B2]"
                    >
                      Visit Marvedge Platform <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <a
            href={MARVEDGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-[#000000]/70 transition-colors hover:text-[#000000] ${focusRing}`}
          >
            <span>Marvedge.com</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <a
            href={MARVEDGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pure-black text-xs font-semibold tracking-wide"
          >
            Launch Marvedge
          </a>

          {/* Mobile hamburger button */}
          <button
            type="button"
            aria-expanded={mobile}
            onClick={() => setMobile((prev) => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#D6CCB5] bg-transparent text-black transition-colors hover:bg-[#D6CCB5]/40 lg:hidden ${focusRing}`}
            aria-label="Toggle navigation menu"
          >
            {mobile ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobile && (
        <div className="max-h-[80vh] overflow-y-auto overscroll-contain border-t border-[#D6CCB5] bg-[#FFFFFF] px-5 py-6 shadow-2xl lg:hidden">
          <ToolDropdownContent onPick={() => setMobile(false)} />
          <div className="mt-6 flex flex-col gap-2.5 border-t border-[#E8DFCA] pt-4">
            <a
              href={MARVEDGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pure-black w-full text-center text-xs font-semibold"
            >
              Launch Marvedge Platform
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
