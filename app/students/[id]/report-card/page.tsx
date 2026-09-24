import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

export default async function ReportCardPage({ params }: { params: { id: string } }) {
  await requireSession();

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      arm: { include: { schoolClass: true } },
      scores: { include: { armSubject: { include: { subject: true } } } },
      attendances: true,
    },
  });
  if (!student) notFound();

  const totalScore = student.scores.reduce((s, sc) => s + sc.total, 0);
  const average = student.scores.length ? (totalScore / student.scores.length).toFixed(1) : "-";
  const presentDays = student.attendances.filter((a) => a.status === "PRESENT").length;

  return (
    <div className="max-w-3xl mx-auto p-10 font-sans text-ink">
      <div className="no-print mb-6 text-right"><PrintButton /></div>

      <div className="border-2 border-navy p-8">
        <div className="flex items-center justify-between border-b-2 border-navy pb-4 mb-4">
          <div className="w-14 h-14 border-2 border-gold flex items-center justify-center font-serif text-gold text-xl">FS</div>
          <div className="text-center">
            <h1 className="font-serif text-2xl">Force Schools</h1>
            <p className="text-xs text-ink/60">Termly Report Card</p>
          </div>
          <div className="w-14" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-6">
          <p><strong>Name:</strong> {student.lastName}, {student.firstName} {student.otherNames ?? ""}</p>
          <p><strong>Admission No.:</strong> {student.admissionNumber}</p>
          <p><strong>Class:</strong> {student.arm ? `${student.arm.schoolClass.name} ${student.arm.name}` : "-"}</p>
          <p><strong>Days Present:</strong> {presentDays}</p>
        </div>

        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-navy">
              <th className="text-left py-2">Subject</th>
              <th className="text-right">CA1</th>
              <th className="text-right">CA2</th>
              <th className="text-right">Exam</th>
              <th className="text-right">Total</th>
              <th className="text-right">Grade</th>
              <th className="text-left pl-4">Remark</th>
            </tr>
          </thead>
          <tbody>
            {student.scores.map((s) => (
              <tr key={s.id} className="border-b border-line">
                <td className="py-1.5">{s.armSubject.subject.name}</td>
                <td className="text-right">{s.ca1}</td>
                <td className="text-right">{s.ca2}</td>
                <td className="text-right">{s.exam}</td>
                <td className="text-right font-medium">{s.total}</td>
                <td className="text-right">{s.grade ?? "-"}</td>
                <td className="pl-4">{s.remark ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-sm"><strong>Average:</strong> {average}</p>
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div className="border-t border-ink pt-2">Class Teacher's Signature</div>
          <div className="border-t border-ink pt-2">Principal's Signature</div>
        </div>
      </div>
    </div>
  );
}
