import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";
import { SCHOOL } from "@/lib/school-config";

export const dynamic = "force-dynamic";

type TemplateConfig = {
  schoolName?: string;
  motto?: string;
  footerNote?: string;
  showPosition?: boolean;
  showAttendance?: boolean;
  principalTitle?: string;
  headerBg?: string;
  accentColor?: string;
  logoUrl?: string;
  sections?: string[];
};

const DEFAULT_SECTIONS = [
  "header",
  "studentInfo",
  "scoresTable",
  "attendance",
  "position",
  "remarks",
  "signatures",
  "footer",
];

export default async function ReportCardPage({ params }: { params: { id: string } }) {
  await requireSession();

  const [student, tpl] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.id },
      include: {
        arm: { include: { schoolClass: true } },
        scores: { include: { armSubject: { include: { subject: true } } } },
        attendances: true,
      },
    }),
    prisma.reportCardTemplate.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  if (!student) notFound();

  const cfg: TemplateConfig = tpl
    ? (JSON.parse(tpl.configJson) as TemplateConfig)
    : {
        schoolName: SCHOOL.name,
        motto: SCHOOL.motto,
        logoUrl: "/logo.svg",
        headerBg: "#1a2744",
        accentColor: "#c9a227",
        sections: DEFAULT_SECTIONS,
        principalTitle: "Principal",
        footerNote: "This is a computer-generated report.",
        showAttendance: true,
        showPosition: true,
      };

  const sections = cfg.sections?.length ? cfg.sections : DEFAULT_SECTIONS;
  const has = (id: string) => sections.includes(id);
  const schoolName = cfg.schoolName || SCHOOL.name;
  const motto = cfg.motto || SCHOOL.motto;
  const logoUrl = cfg.logoUrl || "/logo.svg";
  const headerBg = cfg.headerBg || "#1a2744";
  const accent = cfg.accentColor || "#c9a227";
  const principalTitle = cfg.principalTitle || "Principal";

  const totalScore = student.scores.reduce((s, sc) => s + sc.total, 0);
  const average = student.scores.length ? (totalScore / student.scores.length).toFixed(1) : "-";
  const presentDays = student.attendances.filter((a) => a.status === "PRESENT").length;
  const totalDays = student.attendances.length;
  const classLabel = student.arm
    ? `${student.arm.schoolClass.name} ${student.arm.name}`
    : "—";
  const positionLabel = student.scores.length > 0 ? `Average ${average}` : "—";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-10 font-sans text-ink">
      <div className="no-print mb-6 flex justify-between items-center gap-3">
        <a href={`/students/${student.id}`} className="text-sm text-navy underline">
          ← Back to student
        </a>
        <PrintButton />
      </div>

      <div className="border border-line bg-white shadow-sm overflow-hidden print:shadow-none">
        {has("header") && (
          <div className="text-center text-paper p-5" style={{ background: headerBg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-14 mx-auto mb-2 object-contain bg-white/10 rounded p-1"
            />
            <h1 className="font-serif text-xl sm:text-2xl">{schoolName}</h1>
            {motto && <p className="text-xs opacity-90 mt-1">{motto}</p>}
            <p className="text-[11px] mt-2 tracking-wide uppercase" style={{ color: accent }}>
              Terminal report card
            </p>
          </div>
        )}

        <div className="p-4 sm:p-8">
          {has("studentInfo") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-6 border border-line p-3">
              <p>
                <strong>Name:</strong> {student.lastName}, {student.firstName}{" "}
                {student.otherNames ?? ""}
              </p>
              <p>
                <strong>Admission No.:</strong> {student.admissionNumber}
              </p>
              <p>
                <strong>Class:</strong> {classLabel}
              </p>
              <p>
                <strong>Status:</strong> {student.status}
              </p>
            </div>
          )}

          {has("scoresTable") && (
            <>
              <div className="sm:hidden space-y-3 mb-6 print:hidden">
                {student.scores.length === 0 && (
                  <p className="text-center text-ink/50 py-6 text-sm border border-dashed border-line">
                    No scores entered for this student yet.
                  </p>
                )}
                {student.scores.map((s) => (
                  <div key={s.id} className="border border-line rounded-sm p-3 text-sm">
                    <p className="font-medium text-navy mb-2">{s.armSubject.subject.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs mb-2">
                      <div>
                        <p className="text-ink/50">CA1</p>
                        <p className="font-medium">{s.ca1}</p>
                      </div>
                      <div>
                        <p className="text-ink/50">CA2</p>
                        <p className="font-medium">{s.ca2}</p>
                      </div>
                      <div>
                        <p className="text-ink/50">Exam</p>
                        <p className="font-medium">{s.exam}</p>
                      </div>
                      <div>
                        <p className="text-ink/50">Total</p>
                        <p className="font-medium">{s.total}</p>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-line pt-2 text-xs">
                      <span>
                        <span className="text-ink/50">Grade: </span>
                        <strong>{s.grade ?? "—"}</strong>
                      </span>
                      <span className="text-right max-w-[60%]">
                        <span className="text-ink/50">Remark: </span>
                        {s.remark ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto mb-6 print:block">
                <table className="w-full text-sm border-collapse min-w-[520px]">
                  <thead>
                    <tr style={{ background: headerBg, color: "#fff" }}>
                      <th className="text-left py-2 px-2">Subject</th>
                      <th className="text-right px-2">CA1</th>
                      <th className="text-right px-2">CA2</th>
                      <th className="text-right px-2">Exam</th>
                      <th className="text-right px-2">Total</th>
                      <th className="text-right px-2">Grade</th>
                      <th className="text-left pl-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.scores.map((s) => (
                      <tr key={s.id} className="border-b border-line">
                        <td className="py-1.5 px-2">{s.armSubject.subject.name}</td>
                        <td className="text-right px-2">{s.ca1}</td>
                        <td className="text-right px-2">{s.ca2}</td>
                        <td className="text-right px-2">{s.exam}</td>
                        <td className="text-right px-2 font-medium">{s.total}</td>
                        <td className="text-right px-2">{s.grade ?? "—"}</td>
                        <td className="pl-3">{s.remark ?? "—"}</td>
                      </tr>
                    ))}
                    {student.scores.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-ink/50 py-6">
                          No scores entered for this student yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {has("attendance") && cfg.showAttendance !== false && (
            <p className="text-sm mb-2">
              <strong>Attendance:</strong>{" "}
              {totalDays ? `${presentDays} / ${totalDays} days recorded` : "No attendance recorded"}
            </p>
          )}

          {has("position") && cfg.showPosition !== false && (
            <p className="text-sm mb-2">
              <strong>Performance:</strong> {positionLabel}
            </p>
          )}

          {has("remarks") && (
            <p className="text-sm mb-4 italic text-ink/80">
              Keep working hard. Education with Godliness.
            </p>
          )}

          {has("signatures") && (
            <div className="grid grid-cols-2 gap-8 mt-10 text-sm">
              <div className="border-t border-ink pt-2 text-center">{principalTitle}</div>
              <div className="border-t border-ink pt-2 text-center">Class teacher</div>
            </div>
          )}

          {has("footer") && (
            <p className="text-[10px] text-ink/50 mt-8 text-center">
              {cfg.footerNote || "This is a computer-generated report."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
