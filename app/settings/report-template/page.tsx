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
        schoolName: "Force Schools",
        motto: "Excellence in Character and Learning",
        footerNote: "This is a computer-generated report.",
        showPosition: true,
        showAttendance: true,
        principalTitle: "Principal",
      };

  return (
    <PortalShell role={session.role} title="Report card designer" subtitle="Header, motto, footer options">
      <ReportTemplateForm initial={config} />
      <p className="text-xs text-ink/50 mt-4">
        Applied when printing student report cards. Not a full drag-and-drop layout editor — that needs a
        dedicated product.
      </p>
    </PortalShell>
  );
}
