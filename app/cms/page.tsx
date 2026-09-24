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

  const [pages, themeRow] = await Promise.all([
    prisma.cmsPage.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.siteTheme.findFirst(),
  ]);

  const theme = themeRow
    ? JSON.parse(themeRow.configJson)
    : { primary: "#1a2744", accent: "#c9a227", font: "serif" };

  return (
    <PortalShell role={session.role} title="Website CMS" subtitle="Block builder, media, theme">
      <CmsEditor
        theme={theme}
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
