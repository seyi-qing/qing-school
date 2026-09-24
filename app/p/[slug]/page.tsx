import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Block =
  | { type: "heading"; text: string; level: number }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string }
  | { type: "button"; label: string; href: string }
  | { type: "divider" };

function renderBlocks(body: string): string {
  try {
    const blocks = JSON.parse(body) as Block[];
    if (!Array.isArray(blocks)) throw new Error("not blocks");
    return blocks
      .map((b) => {
        if (b.type === "heading") return `<h${b.level || 2}>${b.text}</h${b.level || 2}>`;
        if (b.type === "paragraph") return `<p>${b.text.replace(/\n/g, "<br/>")}</p>`;
        if (b.type === "image")
          return `<img src="${b.url}" alt="${b.alt || ""}" style="max-width:100%;height:auto;margin:1rem 0"/>`;
        if (b.type === "button")
          return `<p><a href="${b.href}" style="display:inline-block;padding:10px 18px;background:var(--cms-primary,#1a2744);color:#fff;text-decoration:none">${b.label}</a></p>`;
        if (b.type === "divider") return "<hr/>";
        return "";
      })
      .join("\n");
  } catch {
    return body.replace(/\n/g, "<br/>");
  }
}

export default async function PublicCmsPage({ params }: { params: { slug: string } }) {
  const [page, themeRow] = await Promise.all([
    prisma.cmsPage.findFirst({ where: { slug: params.slug, published: true } }),
    prisma.siteTheme.findFirst(),
  ]);
  if (!page) notFound();

  const theme = themeRow
    ? JSON.parse(themeRow.configJson)
    : { primary: "#1a2744", accent: "#c9a227", font: "serif" };

  return (
    <main
      className="min-h-screen bg-paper text-ink"
      style={{
        fontFamily: theme.font === "sans" ? "system-ui, sans-serif" : "Georgia, serif",
        // @ts-expect-error custom property
        "--cms-primary": theme.primary,
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
          dangerouslySetInnerHTML={{ __html: renderBlocks(page.body) }}
        />
      </article>
    </main>
  );
}
