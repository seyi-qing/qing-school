import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  let notices: Array<{ id: string; title: string; body: string; createdAt: Date }> = [];

  try {
    notices = await prisma.notice.findMany({
      where: { publishToWeb: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  } catch (err) {
    console.error("[homepage] notice query failed:", err);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper px-4 sm:px-8 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 border-2 border-gold flex items-center justify-center font-serif text-gold text-sm">
            FS
          </div>
          <span className="font-serif text-lg truncate">Force Schools</span>
        </div>
        <nav className="flex flex-wrap gap-3 sm:gap-6 text-sm justify-end">
          <a href="/admissions" className="hover:text-gold">
            Admissions
          </a>
          <a href="/result-checker" className="hover:text-gold">
            Results
          </a>
          <a href="/complaints" className="hover:text-gold hidden sm:inline">
            Feedback
          </a>
          <a
            href="/login"
            className="border border-gold px-3 py-1 hover:bg-gold hover:text-navy"
          >
            Portal Login
          </a>
        </nav>
      </header>

      <section className="px-4 sm:px-8 py-14 sm:py-20 text-center border-b border-line">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl max-w-2xl mx-auto leading-tight">
          Excellence in Character and Learning
        </h1>
        <p className="mt-4 text-ink/60 max-w-lg mx-auto text-sm sm:text-base">
          Admissions for the 2025/2026 session are now open.
        </p>
        <a
          href="/admissions"
          className="inline-block mt-6 bg-navy text-paper px-6 py-3 text-sm hover:bg-navy-light"
        >
          Start Online Admission
        </a>
      </section>

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

      <footer className="bg-navy text-paper/60 text-xs px-4 sm:px-8 py-6 text-center">
        &copy; {new Date().getFullYear()} Force Schools.{" "}
        <a href="/complaints" className="underline hover:text-gold">
          Feedback
        </a>
      </footer>
    </main>
  );
}
