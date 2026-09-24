import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { PortalShell } from "@/components/PortalShell";
import { formatNaira, formatDate } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      arm: { include: { schoolClass: true } },
      invoices: { include: { payments: true }, orderBy: { createdAt: "desc" } },
      scores: { include: { armSubject: { include: { subject: true } } } },
      attendances: { orderBy: { date: "desc" }, take: 15 },
      parentLinks: { include: { parent: { select: { email: true } } } },
    },
  });
  if (!student) notFound();

  return (
    <PortalShell
      role={session.role}
      title={`${student.lastName}, ${student.firstName}`}
      subtitle={student.admissionNumber}
      actions={
        <Link href={`/students/${student.id}/report-card`} className="border border-navy text-navy text-sm px-4 py-2 hover:bg-navy hover:text-paper">
          Report Card
        </Link>
      }
    >
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Profile</h2>
          <dl className="text-sm space-y-2">
            <Row label="Gender" value={student.gender ?? "-"} />
            <Row label="Class" value={student.arm ? `${student.arm.schoolClass.name} ${student.arm.name}` : "Unassigned"} />
            <Row label="Status" value={student.status} />
            <Row label="Address" value={student.address ?? "-"} />
          </dl>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Fee Invoices</h2>
          <ul className="text-sm space-y-1">
            {student.invoices.map((inv) => (
              <li key={inv.id} className="flex justify-between border-b border-line py-1">
                <span>{formatNaira(inv.totalAmount)}</span>
                <StatusPill status={inv.status} />
              </li>
            ))}
            {student.invoices.length === 0 && <li className="text-ink/50">No invoices.</li>}
          </ul>
        </section>

        <section className="ledger-block">
          <h2 className="font-serif text-lg mb-3">Recent Attendance</h2>
          <ul className="text-sm space-y-1">
            {student.attendances.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line py-1">
                <span>{formatDate(a.date)}</span>
                <StatusPill status={a.status} />
              </li>
            ))}
            {student.attendances.length === 0 && <li className="text-ink/50">No attendance yet.</li>}
          </ul>
        </section>
      </div>

      <section className="ledger-block !p-0 overflow-x-auto">
        <div className="p-4 pb-0"><h2 className="font-serif text-lg">Results</h2></div>
        <table className="ledger mt-3">
          <thead>
            <tr><th>Subject</th><th>CA1</th><th>CA2</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr>
          </thead>
          <tbody>
            {student.scores.map((s) => (
              <tr key={s.id}>
                <td>{s.armSubject.subject.name}</td>
                <td>{s.ca1}</td><td>{s.ca2}</td><td>{s.exam}</td>
                <td className="font-medium">{s.total}</td>
                <td>{s.grade ?? "-"}</td><td>{s.remark ?? "-"}</td>
              </tr>
            ))}
            {student.scores.length === 0 && (
              <tr><td colSpan={7} className="text-center text-ink/50 py-6">No scores yet.</td></tr>
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
    status === "PAID" || status === "PRESENT" ? "text-sage"
    : status === "PARTIAL" || status === "LATE" ? "text-gold-dark"
    : status === "UNPAID" || status === "ABSENT" ? "text-brick"
    : "text-ink/60";
  return <span className={`status-pill ${tone}`}>{status}</span>;
}
