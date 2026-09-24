import { prisma } from "@/lib/db";

/**
 * Public Homepage
 * ------------------------------------------------------------------
 * Public start page. Pulls published notices from the same DB as the rest
 * of the ERP. Wrapped in try/catch so a fresh deploy (before `prisma db push`)
 * still renders instead of a hard 500.
 */
export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  let notices: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: Date;
  }> = [];

  try {
    notices = await prisma.notice.findMany({
      where: { publishToWeb: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  } catch (err) {
    // Tables not created yet (P2021) or DB unreachable during first setup.
    console.error("[homepage] notice query failed:", err);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-gold flex items-center justify-center font-serif text-gold text-sm">
            FS
          </div>
          <span className="font-serif text-lg">Force Schools</span>
        </div>
        <nav className="flex gap-6 text-sm">
          <a href="#about" className="hover:text-gold">
            About
          </a>
          <a href="#news" className="hover:text-gold">
            News
          </a>
          <a href="/result-checker" className="hover:text-gold">
            Result Checker
          </a>
          <a
            href="/login"
            className="border border-gold px-3 py-1 hover:bg-gold hover:text-navy"
          >
            Portal Login
          </a>
        </nav>
      </header>

      <section className="px-8 py-20 text-center border-b border-line">
        <h1 className="font-serif text-4xl md:text-5xl max-w-2xl mx-auto leading-tight">
          Excellence in Character and Learning
        </h1>
        <p className="mt-4 text-ink/60 max-w-lg mx-auto">
          Admissions for the 2025/2026 session are now open.
        </p>
        <a
          href="#"
          className="inline-block mt-6 bg-navy text-paper px-6 py-3 text-sm hover:bg-navy-light"
        >
          Start Online Admission
        </a>
      </section>

      <section id="news" className="px-8 py-14 max-w-3xl mx-auto">
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
            <p className="text-ink/50 text-sm">
              No notices published yet — post one from Communication with &quot;Also
              publish on public website&quot; checked.
            </p>
          )}
        </div>
      </section>

      <footer className="bg-navy text-paper/60 text-xs px-8 py-6 text-center">
        &copy; {new Date().getFullYear()} Force Schools. Built on Force Schools
        ERP.
      </footer>
    </main>
  );
}
