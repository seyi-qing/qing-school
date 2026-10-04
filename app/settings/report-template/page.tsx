import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ReportTemplateForm } from "./ReportTemplateForm";

export const dynamic = "force-dynamic";

export default async function ReportTemplatePage() {
  const session = await requireSession();
  if (!["ADMIN", "IT", "PRINCIPAL"].includes(session.role)) {
    redirect(homeRouteForRole(session.role));
  }

  const tpl = await prisma.reportCardTemplate.findFirst({ orderBy: { updatedAt: "desc" } });
  const config = tpl
    ? JSON.parse(tpl.configJson)
    : {
        schoolName: "Kayvlop Magnificent School",
        motto: "Education with Godliness",
        footerNote: "This is a computer-generated report.",
        showPosition: true,
        showAttendance: true,
        principalTitle: "Principal",
        logoUrl: "/logo.svg",
      };

  return (
    <PortalShell
      role={session.role}
      title="Report card designer"
      subtitle="Logo, colours, section order — used when printing report cards"
    >
      <ReportTemplateForm initial={config} />
      <p className="text-xs text-ink/50 mt-4">
        Drag sections to reorder. Use the school logo button or upload an image. This controls the printed
        card layout; it is not a freeform Canva-style designer.
      </p>
    </PortalShell>
  );
}
