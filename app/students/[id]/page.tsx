import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { StudentDocuments } from "@/components/StudentDocuments";
import { ApproveStudentButton } from "@/components/ApproveStudentButton";
import { can } from "@/lib/permissions";
import { formatNaira, formatDate } from "@/lib/format";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  if (session.role === "STUDENT") {
    const owns = await prisma.student.findFirst({ where: { id: params.id, userId: session.userId } });
    if (!owns) redirect("/portal/student");
  }
  if (session.role === "PARENT") {
    const linked = await prisma.parentLink.findFirst({
      where: { studentId: params.id, parentId: session.userId },
    });
    if (!linked) redirect("/portal/parent");
  }

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      arm: { include: { schoolClass: true } },
      invoices: { orderBy: { createdAt: "desc" } },
      scores: { include: { armSubject: { include: { subject: true } } } },
      attendances: { orderBy: { date: "desc" }, take: 10 },
      parentLinks: { include: { parent: { select: { email: true } } } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!student) notFound();

  const canManage = can(session.role, "MANAGE_STUDENTS");

  return (
    <PortalShell
      role={session.role}
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`${student.admissionNumber} · ${student.arm ? `${student.arm.schoolClass.name} ${student.arm.name}` : "Unassigned"} · ${student.status}`}
      actions={
        student.status === "APPLIED" && canManage ? (
          <ApproveStudentButton studentId={student.id} />
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Bio Data</h2>
          <dl className="text-sm space-y-1.5">
            <Row label="Gender" value={student.gender ?? "-"} />
            <Row
              label="Date of birth"
              value={student.dateOfBirth ? formatDate(student.dateOfBirth) : "-"}
            />
            <Row label="Address" value={student.address ?? "-"} />
            <Row label="Previous school" value={student.previousSchool ?? "-"} />
            <Row label="Status" value={student.status} />
            <Row label="Medical / notes" value={student.medicalNotes ?? "None recorded"} />
            <Row
              label="Guardian(s)"
              value={student.parentLinks.map((p) => p.parent.email).join(", ") || "None linked"}
            />
          </dl>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Fee Invoices</h2>
          {student.invoices.length === 0 && <p className="text-sm text-ink/50">No invoices yet.</p>}
          <ul className="text-sm space-y-2">
            {student.invoices.map((inv) => (
              <li key={inv.id} className="border-b border-line pb-2 last:border-0">
                <div className="flex justify-between">
                  <span>{formatNaira(inv.totalAmount)}</span>
                  <StatusPill status={inv.status} />
                </div>
                <p className="text-xs text-ink/50">
                  Paid {formatNaira(inv.amountPaid)} · {formatDate(inv.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent Attendance</h2>
          {student.attendances.length === 0 && (
            <p className="text-sm text-ink/50">No attendance recorded yet.</p>
          )}
          <ul className="text-sm space-y-1">
            {student.attendances.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line py-1 last:border-0">
                <span>{formatDate(a.date)}</span>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <StudentDocuments
        studentId={student.id}
        canManage={canManage}
        documents={student.documents.map((d) => ({
          id: d.id,
          label: d.label,
          fileUrl: d.fileUrl,
          uploadedAt: d.uploadedAt.toISOString(),
        }))}
      />

      <section className="ledger-block mt-6 !p-0 overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-serif text-lg">Results (all terms)</h2>
        </div>
        <table className="ledger mt-3">
          <thead>
            <tr>
              <th>Subject</th>
              <th>CA1</th>
              <th>CA2</th>
              <th>Exam</th>
              <th>Total</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {student.scores.map((s) => (
              <tr key={s.id}>
                <td>{s.armSubject.subject.name}</td>
                <td>{s.ca1}</td>
                <td>{s.ca2}</td>
                <td>{s.exam}</td>
                <td className="font-medium">{s.total}</td>
                <td>{s.grade ?? "-"}</td>
                <td>{s.remark ?? "-"}</td>
              </tr>
            ))}
            {student.scores.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink/50 py-6">
                  No scores entered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PortalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID" || status === "PRESENT"
      ? "text-sage"
      : status === "PARTIAL" || status === "LATE"
        ? "text-gold-dark"
        : status === "UNPAID" || status === "ABSENT"
          ? "text-brick"
          : "text-ink/60";
  return <span className={`status-pill ${tone}`}>{status}</span>;
}
