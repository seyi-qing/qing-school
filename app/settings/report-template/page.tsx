import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { homeRouteForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { ReportTemplateForm } from "./ReportTemplateForm";

export default async function ReportTemplatePage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SYSTEM_SETTINGS")) redirect(homeRouteForRole(session.role));

  const row = await prisma.reportTemplate.findFirst();
  const config = row
    ? JSON.parse(row.config)
    : {
        schoolName: "Kayvlop Magnificent School",
        motto: "Education with Godliness",
        showPosition: true,
        showAttendance: true,
      };

  return (
    <PortalShell title="Report card template" user={session}>
      <ReportTemplateForm initial={config} />
    </PortalShell>
  );
}
