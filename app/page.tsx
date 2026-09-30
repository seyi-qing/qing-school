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

const FEATURES = [
  {
    title: "Holistic Education",
    body: "Academic excellence rooted in character formation and godly values — preparing students for life, not just exams.",
    icon: "📖",
  },
  {
    title: "Modern Learning",
    body: "Digital classrooms, CBT assessments, library resources and a full parent portal so families stay informed.",
    icon: "💻",
  },
  {
    title: "Transparent Fees",
    body: "Online fee payment, instant receipts and clear statements. No surprises — only accountability.",
    icon: "💳",
  },
  {
    title: "Safe & Caring",
    body: "Hostel, transport, leave management and attentive staff committed to every child’s wellbeing.",
    icon: "🛡️",
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
    <main className="min-h-screen bg-paper text-ink">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy-dark text-paper">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-brick/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <p className="text-gold text-xs sm:text-sm uppercase tracking-[0.2em] font-medium mb-4">
              {SCHOOL.motto}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight max-w-xl">
              {SCHOOL.tagline}
            </h1>
            <p className="mt-5 text-paper/75 max-w-lg text-sm sm:text-base leading-relaxed">
              Welcome to {SCHOOL.name}. Admissions for the new session are open. Join a community
              where learning meets character and faith.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admissions"
                className="inline-flex items-center bg-gold text-navy-dark px-6 py-3 text-sm font-semibold hover:bg-gold-light transition-colors"
              >
                Start Online Admission
              </Link>
              <Link
                href="/result-checker"
                className="inline-flex items-center border border-paper/40 px-6 py-3 text-sm hover:border-gold hover:text-gold transition-colors"
              >
                Check Results
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 drop-shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt={SCHOOL.name} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {cmsHtml ? (
        <section className="px-4 sm:px-8 py-12 max-w-3xl mx-auto">
          <div
            className="prose text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cmsHtml }}
          />
        </section>
      ) : (
        <>
          <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-serif text-2xl sm:text-3xl">Why families choose {SCHOOL.name}</h2>
              <p className="mt-3 text-ink/60 text-sm sm:text-base">
                A complete learning environment with modern systems and timeless values.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="ledger-block hover:border-navy/30 transition-colors group"
                >
                  <span className="text-2xl" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="font-serif text-lg mt-3 group-hover:text-navy">{f.title}</h3>
                  <p className="text-sm text-ink/65 mt-2 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-navy text-paper">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl">Ready to join us?</h2>
                <p className="mt-2 text-paper/70 text-sm max-w-md">
                  Complete the online admission form in minutes. Our office will review and guide
                  you through the next steps.
                </p>
              </div>
              <Link
                href="/admissions"
                className="shrink-0 bg-gold text-navy-dark px-7 py-3.5 text-sm font-semibold hover:bg-gold-light transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </section>
        </>
      )}

      <section id="news" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl">School News & Notices</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      <section className="border-t border-line bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 grid sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <p className="font-serif text-lg">Parents</p>
            <p className="text-sm text-ink/60 mt-1">
              View results, fees and attendance for your children.
            </p>
            <Link href="/login" className="text-sm text-navy font-medium mt-2 inline-block hover:underline">
              Parent login →
            </Link>
          </div>
          <div>
            <p className="font-serif text-lg">Students</p>
            <p className="text-sm text-ink/60 mt-1">Access your portal, CBT and report cards.</p>
            <Link href="/login" className="text-sm text-navy font-medium mt-2 inline-block hover:underline">
              Student login →
            </Link>
          </div>
          <div>
            <p className="font-serif text-lg">Staff</p>
            <p className="text-sm text-ink/60 mt-1">
              Mark attendance, enter scores, manage classes.
            </p>
            <Link href="/login" className="text-sm text-navy font-medium mt-2 inline-block hover:underline">
              Staff login →
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
