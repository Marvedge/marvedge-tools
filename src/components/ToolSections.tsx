import type { ToolSeoData, ToolStatusValue } from "@/lib/tool-seo";
import type { Tool } from "@/lib/tools";
import {
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Laptop,
  Info,
} from "lucide-react";

function StatusBadge({ status }: { status: ToolStatusValue }) {
  if (status === "Yes") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
        Supported
      </span>
    );
  }
  if (status === "Partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        Conditional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
      <X className="h-3 w-3 shrink-0" aria-hidden="true" />
      Unsupported
    </span>
  );
}

export function ToolEditorialSections({
  seo,
  tool: _tool,
}: {
  seo: ToolSeoData;
  tool: Tool;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-6 sm:px-8">
      {/* SECTION 1: HOW IT WORKS IN 3 STEPS */}
      <section className="border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          How it works
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.howItWorks.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A4740] sm:text-base">
          {seo.howItWorks.intro}
        </p>

        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {seo.howItWorks.steps.map((step, idx) => (
            <li
              key={step.title}
              className="flex flex-col justify-between rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 shadow-xs transition-colors hover:border-[#7895B2]"
            >
              <div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#000000] text-sm font-bold text-white shadow-xs">
                  {idx + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#000000]">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#4A4740] sm:text-sm">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* SECTION 2: ON ANY DEVICE */}
      <section className="mt-14 border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          On any device
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.environments.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A4740] sm:text-base">
          {seo.environments.intro}
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {seo.environments.cards.map((env) => {
            const isDesktop = env.title.toLowerCase().includes("mac") || env.title.toLowerCase().includes("windows");
            return (
              <div
                key={env.title}
                className="flex flex-col justify-between rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 shadow-xs"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF7F0] border border-[#D6CCB5]">
                    {isDesktop ? (
                      <Laptop className="h-4 w-4 text-[#537190]" aria-hidden="true" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-[#537190]" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#000000]">
                    {env.title}
                  </h3>
                  <ol className="mt-3 space-y-2 text-xs leading-relaxed text-[#4A4740]">
                    {env.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-semibold text-[#000000] shrink-0">
                          {i + 1}.
                        </span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note Banner */}
        {seo.environments.note && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-[#537190]/50 bg-[#FFFFFF] p-4 text-xs leading-relaxed text-[#4A4740]">
            <Info className="h-4 w-4 text-[#537190] shrink-0 mt-0.5" aria-hidden="true" />
            <p>{seo.environments.note}</p>
          </div>
        )}
      </section>

      {/* SECTION 3: SPECIFICATIONS & PARAMETERS */}
      <section className="mt-14 border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          Specifications
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.specs.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A4740] sm:text-base">
          {seo.specs.intro}
        </p>

        {/* 6-Item Technical Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {seo.specs.items.map((spec) => (
            <div
              key={spec.label}
              className="rounded-xl border border-[#D6CCB5] bg-[#FFFFFF] p-4 text-center shadow-xs"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#537190]">
                {spec.label}
              </div>
              <div className="mt-1.5 text-sm font-bold text-[#000000]">
                {spec.value}
              </div>
              <div className="mt-1 text-[11px] text-[#4A4740]">
                {spec.detail}
              </div>
            </div>
          ))}
        </div>

        {/* 3 Callout Parameter Cards */}
        {seo.specs.callouts.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {seo.specs.callouts.map((callout) => (
              <div
                key={callout.title}
                className="rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-5 shadow-xs"
              >
                <h3 className="text-sm font-semibold text-[#000000]">
                  {callout.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#4A4740]">
                  {callout.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: WHAT WORKS (COMPATIBILITY MATRIX) */}
      <section className="mt-14 border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          Compatibility
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.compatibility.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A4740] sm:text-base">
          {seo.compatibility.intro}
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] shadow-xs">
          {/* Table Header */}
          <div className="grid grid-cols-12 border-b border-[#D6CCB5] bg-[#FAF7F0] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#537190]">
            <div className="col-span-4 sm:col-span-4">{seo.compatibility.columns[0] || "Target"}</div>
            <div className="col-span-4 sm:col-span-3">{seo.compatibility.columns[1] || "Status"}</div>
            <div className="col-span-4 sm:col-span-5">{seo.compatibility.columns[2] || "Details"}</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#D6CCB5]/60">
            {seo.compatibility.rows.map((row) => (
              <div
                key={row.target}
                className="grid grid-cols-12 items-center px-5 py-3.5 text-xs transition-colors hover:bg-[#FAF7F0]/50"
              >
                <div className="col-span-4 font-semibold text-[#000000]">
                  {row.target}
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <StatusBadge status={row.status} />
                </div>
                <div className="col-span-4 sm:col-span-5 text-[#4A4740] leading-relaxed">
                  {row.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: TROUBLESHOOTING */}
      <section className="mt-14 border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          Troubleshooting
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.troubleshooting.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A4740] sm:text-base">
          {seo.troubleshooting.intro}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {seo.troubleshooting.items.map((item) => (
            <div
              key={item.issue}
              className="rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-5 shadow-xs"
            >
              <h3 className="text-sm font-semibold text-[#000000]">
                {item.issue}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#4A4740]">
                {item.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: PRIVACY GUARANTEE */}
      <section className="mt-14 border-t border-[#D6CCB5] pt-12 sm:pt-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#537190]">
          Privacy
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
          {seo.privacy.heading}
        </h2>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#D6CCB5] bg-[#FFFFFF] p-6 shadow-xs sm:p-7">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#000000]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <span>Files remain strictly on your local machine</span>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#4A4740] sm:text-sm">
            {seo.privacy.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
