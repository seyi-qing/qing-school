import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { StudentDocuments } from "@/components/StudentDocuments";
import { ApproveStudentButton } from "@/components/ApproveStudentButton";
import { StudentEditForm } from "@/components/StudentEditForm";
import { StudentLifecycleActions } from "@/components/StudentLifecycleActions";
import { can } from "@/lib/permissions";
import { formatNaira, formatDate } from "@/lib/format";
import { notFound, redirect } from "next/navigation";
import { resolveSchoolId } from "@/lib/tenant-scope";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const schoolId = await resolveSchoolId(session);

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

  const [student, arms] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.id },
      include: {
        arm: { include: { schoolClass: true } },
        invoices: { orderBy: { createdAt: "desc" } },
        scores: { include: { armSubject: { include: { subject: true } } } },
        attendances: { orderBy: { date: "desc" }, take: 10 },
        parentLinks: { include: { parent: { select: { email: true } } } },
        documents: { orderBy: { uploadedAt: "desc" } },
        hostelAllocs: {
          where: { status: "ACTIVE" },
          include: { room: true },
          take: 1,
        },
        transportEnrolls: {
          where: { status: "ACTIVE" },
          include: { route: true },
          take: 1,
        },
      },
    }),
    prisma.arm.findMany({
      where: schoolId ? { schoolClass: { schoolId } } : undefined,
      include: { schoolClass: true },
      orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
    }),
  ]);

  if (!student) notFound();
  if (schoolId && student.schoolId && student.schoolId !== schoolId) notFound();

  const canManage = can(session.role, "MANAGE_STUDENTS");
  const hostel = student.hostelAllocs[0];
  const transport = student.transportEnrolls[0];
  const classLabel = student.arm
    ? `${student.arm.schoolClass.name} ${student.arm.name}`
    : "Unassigned";

  return (
    <PortalShell
      role={session.role}
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`${student.admissionNumber} · ${classLabel} · ${student.status}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            href={`/students/${student.id}/report-card`}
            className="text-xs sm:text-sm border border-navy text-navy px-3 py-1.5 hover:bg-navy hover:text-paper"
          >
            Report card
          </a>
          {student.status === "APPLIED" && canManage ? (
            <ApproveStudentButton studentId={student.id} />
          ) : null}
        </div>
      }
    >
      {canManage && (
        <div className="mb-6 max-w-2xl space-y-4">
          <StudentEditForm
            studentId={student.id}
            arms={arms.map((a) => ({
              id: a.id,
              label: `${a.schoolClass.name} ${a.name}`,
            }))}
            initial={{
              firstName: student.firstName,
              lastName: student.lastName,
              otherNames: student.otherNames ?? "",
              gender: student.gender ?? "",
              address: student.address ?? "",
              previousSchool: student.previousSchool ?? "",
              medicalNotes: student.medicalNotes ?? "",
              guardianPhone: student.guardianPhone ?? "",
              armId: student.armId ?? "",
              status: student.status,
            }}
          />
          <StudentLifecycleActions
            studentId={student.id}
            admissionNumber={student.admissionNumber}
            fullName={`${student.firstName} ${student.lastName}`}
            status={student.status}
            isAdmin={["ADMIN", "IT"].includes(session.role)}
            hasPaidFees={student.invoices.some((inv) => inv.amountPaid.gt(0))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Bio data</h2>
          <dl className="text-sm space-y-1.5">
            <Row label="Class / Arm" value={classLabel} />
            <Row label="Gender" value={student.gender ?? "-"} />
            <Row
              label="Date of birth"
              value={student.dateOfBirth ? formatDate(student.dateOfBirth) : "-"}
            />
            <Row label="Address" value={student.address ?? "-"} />
            <Row label="Previous school" value={student.previousSchool ?? "-"} />
            <Row label="Status" value={student.status} />
            <Row label="Guardian phone" value={student.guardianPhone ?? "-"} />
            <Row label="Medical / notes" value={student.medicalNotes ?? "None recorded"} />
            <Row
              label="Guardian(s)"
              value={student.parentLinks.map((p) => p.parent.email).join(", ") || "None linked"}
            />
            <Row
              label="Hostel"
              value={
                hostel
                  ? `${hostel.room.block ? hostel.room.block + " / " : ""}${hostel.room.name}${hostel.bedLabel ? " bed " + hostel.bedLabel : ""}`
                  : "Not allocated"
              }
            />
            <Row
              label="Transport"
              value={transport ? transport.route.name : "Not enrolled"}
            />
          </dl>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Fee invoices</h2>
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
          <h2 className="font-serif text-lg mb-3">Recent attendance</h2>
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
      <dt className="text-ink/50 shrink-0">{label}</dt>
      <dd className="text-right break-words">{value}</dd>
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
