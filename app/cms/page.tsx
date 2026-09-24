import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { CmsEditor } from "./CmsEditor";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const session = await requireSession();
  if (!["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const pages = await prisma.cmsPage.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <PortalShell role={session.role} title="Website CMS" subtitle="Public pages (About, News, etc.)">
      <CmsEditor
        pages={pages.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          body: p.body,
          published: p.published,
        }))}
      />
    </PortalShell>
  );
}
