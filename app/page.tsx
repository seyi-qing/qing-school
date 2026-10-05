import { prisma } from "@/lib/db";
import { blocksToHtml, parseBlocks } from "@/lib/cms-blocks";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import { SCHOOL } from "@/lib/school-config";

export const dynamic = "force-dynamic";

function isLive(page: { published: boolean; publishAt: Date | null }) {
  if (!page.published) return false;
  if (page.publishAt && page.publishAt.getTime() > Date.now()) return false;
  return true;
}

const MODULES = [
  { title: "CBT", body: "Computer-based tests with auto-marking", tone: "bg-navy text-paper" },
  { title: "Results", body: "Report cards, PINs & result checker", tone: "bg-gold text-navy-dark" },
  { title: "Attendance", body: "Daily marks + parent SMS alerts", tone: "bg-sage text-paper" },
  { title: "Fees", body: "Invoices, Paystack & print receipts", tone: "bg-brick/90 text-paper" },
  { title: "Parent portal", body: "Balances, absences & notices", tone: "bg-navy-light text-paper" },
  { title: "Transport", body: "Routes, drivers & riders", tone: "bg-navy text-paper" },
];

const WHY = [
  {
    title: "Why families choose KMS",
    body: "Character and academics together — Education with Godliness is not a slogan; it is how we teach.",
  },
  {
    title: "Transparent school fees",
    body: "See balances, pay online and download official receipts. No hidden charges.",
  },
  {
    title: "Always connected",
    body: "Parents get attendance alerts, notices and report cards from one calm dashboard.",
  },
];

export default async function PublicHomePage() {
  let notices: Array<{ id: string; title: string; body: string; createdAt: Date }> = [];
  let homeCms: {
    title: string;
    body: string;
    metaTitle: string | null;
    metaDescription: string | null;
  } | null = null;

  try {
    const [n, home] = await Promise.all([
      prisma.notice.findMany({
        where: { publishToWeb: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.cmsPage.findFirst({ where: { slug: "home" } }),
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
  } catch (err) {
    console.error("[homepage]", err);
  }

  const cmsHtml = homeCms ? blocksToHtml(parseBlocks(homeCms.body)) : null;

  return (
    <main className="min-h-screen bg-paper text-ink overflow-x-hidden">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-[#1e4a7a] to-navy-dark text-paper">
        <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
          <div className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-gold blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-brick/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-20 lg:py-24">
          <p className="text-gold text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            {SCHOOL.shortName} · {SCHOOL.location}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight max-w-2xl">
            Run your child's school journey{" "}
            <span className="text-gold">online</span>
          </h1>
          <p className="mt-4 text-paper/80 text-base sm:text-lg max-w-xl leading-relaxed">
            {SCHOOL.name} — {SCHOOL.tagline}. Admissions, results, fees and parent portal in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/admissions"
              className="inline-flex items-center justify-center bg-gold text-navy-dark px-6 py-3.5 text-sm font-bold tracking-wide hover:bg-gold-light transition-colors"
            >
              Apply for admission
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-paper/40 text-paper px-6 py-3.5 text-sm font-medium hover:bg-paper/10 transition-colors"
            >
              Portal login
            </Link>
            <Link
              href="/result-checker"
              className="inline-flex items-center justify-center text-gold text-sm font-medium hover:underline py-3.5"
            >
              Check results →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className={`${m.tone} rounded-lg px-3 py-3 shadow-sm border border-white/10`}
              >
                <p className="font-bold text-sm tracking-wide">{m.title}</p>
                <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16">
        <h2 className="font-serif text-2xl sm:text-3xl text-center mb-2">Why families choose KMS</h2>
        <p className="text-center text-ink/55 text-sm max-w-lg mx-auto mb-10">{SCHOOL.motto}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHY.map((item) => (
            <article key={item.title} className="ledger-block p-6 hover:border-navy/30 transition-colors">
              <h3 className="font-serif text-lg text-navy">{item.title}</h3>
              <p className="text-sm text-ink/70 mt-3 leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {cmsHtml && (
        <section className="border-y border-line bg-white/60">
          <div
            className="max-w-3xl mx-auto px-4 sm:px-6 py-10 prose prose-sm"
            dangerouslySetInnerHTML={{ __html: cmsHtml }}
          />
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-serif text-2xl">School notices</h2>
          <Link href="/login" className="text-sm text-navy hover:underline">
            Full portal →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notices.map((n) => (
            <article
              key={n.id}
              className="ledger-block flex flex-col hover:border-navy/25 transition-colors"
            >
              <p className="text-[11px] uppercase tracking-wide text-ink/45">
                {new Date(n.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <h3 className="font-serif text-lg mt-2">{n.title}</h3>
              <p className="text-sm text-ink/70 mt-2 line-clamp-3 flex-1">{n.body}</p>
            </article>
          ))}
          {notices.length === 0 && (
            <p className="text-ink/50 text-sm col-span-full">No notices published yet.</p>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-navy text-paper">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              title: "Parents",
              body: "Balances, attendance and report cards for your children.",
              href: "/login",
              cta: "Parent login",
            },
            {
              title: "Students",
              body: "CBT exams, results and your class portal.",
              href: "/login",
              cta: "Student login",
            },
            {
              title: "Staff & Admin",
              body: "Attendance, scores, fees, hostel and transport.",
              href: "/login",
              cta: "Staff login",
            },
          ].map((b) => (
            <div key={b.title}>
              <p className="font-serif text-xl text-gold">{b.title}</p>
              <p className="text-sm text-paper/70 mt-2 leading-relaxed">{b.body}</p>
              <Link
                href={b.href}
                className="inline-block mt-4 text-sm font-semibold text-gold hover:underline"
              >
                {b.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          <div>
            <p className="font-medium text-navy">{SCHOOL.name}</p>
            <p className="text-ink/60">{SCHOOL.contact.address}</p>
          </div>
          <div className="text-ink/70">
            <p>
              {SCHOOL.contact.phone}
              {SCHOOL.contact.phoneAlt ? ` · ${SCHOOL.contact.phoneAlt}` : ""}
            </p>
            <p>{SCHOOL.contact.email}</p>
          </div>
          <Link
            href="/admissions"
            className="inline-flex justify-center bg-navy text-paper px-5 py-2.5 font-medium hover:bg-navy-light transition-colors"
          >
            Enrol now
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
