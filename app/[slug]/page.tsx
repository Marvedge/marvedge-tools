import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools";
import { getToolSeo, buildToolJsonLd } from "@/lib/tool-seo";
import { toolFaqs } from "@/lib/tool-faqs";
import { ToolPage } from "@/components/ToolPage";

export function generateStaticParams() {
  return tools.map((t) => ({
    slug: t.slug,
  }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return {};
  const seo = getToolSeo(slug);

  return {
    title: seo.seoTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.seoTitle,
      description: seo.metaDescription,
      type: "website",
      url: `https://marvedge.com/${slug}`,
      siteName: "Marvedge",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.seoTitle,
      description: seo.metaDescription,
    },
  };
}

async function ToolPageContent({ params }: Props) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) notFound();

  const seo = getToolSeo(slug);
  const faqs = toolFaqs[slug] ?? [];
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

export default function DynamicToolPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <ToolPageContent params={params} />
    </Suspense>
  );
}
