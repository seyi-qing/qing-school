import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicCmsPage({ params }: { params: { slug: string } }) {
  const page = await prisma.cmsPage.findFirst({
    where: { slug: params.slug, published: true },
  });
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper px-4 sm:px-8 py-5 flex justify-between">
        <Link href="/" className="font-serif text-lg">
          Force Schools
        </Link>
        <Link href="/login" className="text-sm border border-gold px-3 py-1">
          Portal
        </Link>
      </header>
      <article className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-serif text-3xl mb-6">{page.title}</h1>
        <div
          className="prose text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: page.body.replace(/\n/g, "<br/>") }}
        />
      </article>
    </main>
  );
}
