import { prisma } from "@/lib/db";
import { blocksToHtml, parseBlocks } from "@/lib/cms-blocks";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function isLive(page: { published: boolean; publishAt: Date | null }) {
  if (!page.published) return false;
  if (page.publishAt && page.publishAt.getTime() > Date.now()) return false;
  return true;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await prisma.cmsPage.findFirst({ where: { slug: params.slug } });
  if (!page || !isLive(page)) return { title: "Not found" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function PublicCmsPage({ params }: { params: { slug: string } }) {
  if (params.slug === "home") {
    // homepage is /
    const { redirect } = await import("next/navigation");
    redirect("/");
  }

  const [page, themeRow] = await Promise.all([
    prisma.cmsPage.findFirst({ where: { slug: params.slug } }),
    prisma.siteTheme.findFirst(),
  ]);
  if (!page || !isLive(page)) notFound();

  const theme = themeRow
    ? JSON.parse(themeRow.configJson)
    : { primary: "#1a2744", accent: "#c9a227", font: "serif" };

  return (
    <main
      className="min-h-screen bg-paper text-ink"
      style={{
        fontFamily: theme.font === "sans" ? "system-ui, sans-serif" : "Georgia, serif",
        // @ts-expect-error css
        "--cms-primary": theme.primary,
        "--cms-accent": theme.accent,
      }}
    >
      <header
        className="px-4 sm:px-8 py-5 flex justify-between text-paper"
        style={{ background: theme.primary }}
      >
        <Link href="/" className="font-serif text-lg">
          Force Schools
        </Link>
        <Link href="/login" className="text-sm border px-3 py-1" style={{ borderColor: theme.accent }}>
          Portal
        </Link>
      </header>
      <article className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-serif text-3xl mb-6">{page.title}</h1>
        <div
          className="prose text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blocksToHtml(parseBlocks(page.body)) }}
        />
      </article>
    </main>
  );
}
