import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { getToolSeo, buildToolJsonLd } from "@/lib/tool-seo";
import { toolFaqs } from "@/lib/tool-faqs";
import { ToolPage } from "@/components/ToolPage";

const tool = getTool("mp4-to-gif");
const seo = getToolSeo("mp4-to-gif");
const faqs = toolFaqs["mp4-to-gif"] ?? [];

export const metadata: Metadata = {
  title: seo.seoTitle,
  description: seo.metaDescription,
  openGraph: {
    title: seo.seoTitle,
    description: seo.metaDescription,
    type: "website",
    url: "https://marvedge.com/mp4-to-gif",
    siteName: "Marvedge",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.seoTitle,
    description: seo.metaDescription,
  },
};

export default function Mp4ToGifPage() {
  const jsonLd = buildToolJsonLd(tool, seo, faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolPage tool={tool} />
    </>
  );
}
