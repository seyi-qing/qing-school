import { prisma } from "@/lib/db";
import { blocksToHtml, parseBlocks } from "@/lib/cms-blocks";
import Link from "next/link";

export const dynamic = "force-dynamic";

function isLive(page: {
  published: boolean;
  publishAt: Date | null;
}) {
  if (!page.published) return false;
  if (page.publishAt && page.publishAt.getTime() > Date.now()) return false;
  return true;
}

export default async function PublicHomePage() {
  let notices: Array<{ id: string; title: string; body: string; createdAt: Date }> = [];
  let homeCms: {
    title: string;
    body: string;
    metaTitle: string | null;
    metaDescription: string | null;
  } | null = null;
  let theme = { primary: "#1a2744", accent: "#c9a227", font: "serif" };

  try {
    const [n, home, themeRow] = await Promise.all([
      prisma.notice.findMany({
        where: { publishToWeb: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.cmsPage.findFirst({ where: { slug: "home" } }),
      prisma.siteTheme.findFirst(),
    ]);
    notices = n;
    if (home && isLive(home)) {
      homeCms = {
        title: home.title,
        body: home.body,
        metaTitle: home.metaTitle,
        metaDescription: home.metaDescription,
      };
    }
    if (themeRow) theme = JSON.parse(themeRow.configJson);
  } catch (err) {
    console.error("[homepage]", err);
  }

  const cmsHtml = homeCms ? blocksToHtml(parseBlocks(homeCms.body)) : null;

  return (
    <main
      className="min-h-screen bg-paper text-ink"
      style={{
        fontFamily: theme.font === "sans" ? "system-ui,sans-serif" : undefined,
        // @ts-expect-error css vars
        "--cms-primary": theme.primary,
        "--cms-accent": theme.accent,
      }}
    >
      <header
        className="text-paper px-4 sm:px-8 py-5 flex items-center justify-between gap-3"
        style={{ background: theme.primary }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 shrink-0 border-2 flex items-center justify-center font-serif text-sm"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            FS
          </div>
          <span className="font-serif text-lg truncate">Force Schools</span>
        </div>
        <nav className="flex flex-wrap gap-3 sm:gap-6 text-sm justify-end">
          <Link href="/admissions" className="hover:opacity-80">
            Admissions
          </Link>
          <Link href="/result-checker" className="hover:opacity-80">
            Results
          </Link>
          <Link href="/complaints" className="hover:opacity-80 hidden sm:inline">
            Feedback
          </Link>
          <Link
            href="/login"
            className="border px-3 py-1"
            style={{ borderColor: theme.accent }}
          >
            Portal Login
          </Link>
        </nav>
      </header>

      {cmsHtml ? (
        <section className="px-4 sm:px-8 py-10 max-w-3xl mx-auto">
          <div
            className="prose text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cmsHtml }}
          />
        </section>
      ) : (
        <section className="px-4 sm:px-8 py-14 sm:py-20 text-center border-b border-line">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl max-w-2xl mx-auto leading-tight">
            Excellence in Character and Learning
          </h1>
          <p className="mt-4 text-ink/60 max-w-lg mx-auto text-sm sm:text-base">
            Admissions for the 2025/2026 session are now open.
          </p>
          <Link
            href="/admissions"
            className="inline-block mt-6 text-paper px-6 py-3 text-sm"
            style={{ background: theme.primary }}
          >
            Start Online Admission
          </Link>
          <p className="text-xs text-ink/40 mt-6">
            Tip: create a CMS page with slug <code>home</code> to replace this default hero.
          </p>
        </section>
      )}

      <section id="news" className="px-4 sm:px-8 py-14 max-w-3xl mx-auto">
        <h2 className="font-serif text-2xl mb-6">School News & Notices</h2>
        <div className="space-y-4">
          {notices.map((n) => (
            <article key={n.id} className="border-b border-line pb-4">
              <h3 className="font-serif text-lg">{n.title}</h3>
              <p className="text-sm text-ink/70 mt-1">{n.body}</p>
              <p className="text-xs text-ink/40 mt-1">
                {new Date(n.createdAt).toLocaleDateString()}
              </p>
            </article>
          ))}
          {notices.length === 0 && (
            <p className="text-ink/50 text-sm">No notices published yet.</p>
          )}
        </div>
      </section>

      <footer
        className="text-paper/60 text-xs px-4 sm:px-8 py-6 text-center"
        style={{ background: theme.primary }}
      >
        &copy; {new Date().getFullYear()} Force Schools.{" "}
        <Link href="/complaints" className="underline">
          Feedback
        </Link>
      </footer>
    </main>
  );
}
