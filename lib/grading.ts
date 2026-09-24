/**
 * Grading
 * ------------------------------------------------------------------
 * Converts a numeric total (CA1 + CA2 + Exam) into a letter grade and remark
 * using the GradeBand table, which the admin can edit freely from
 * /settings/grading -- so a school using WAEC-style A1-F9 bands and one
 * using simple A-F bands both just work without touching code.
 */
import { prisma } from "@/lib/db";

export const DEFAULT_GRADE_BANDS = [
  { minScore: 75, maxScore: 100, grade: "A1", remark: "Excellent" },
  { minScore: 70, maxScore: 74, grade: "B2", remark: "Very Good" },
  { minScore: 65, maxScore: 69, grade: "B3", remark: "Good" },
  { minScore: 60, maxScore: 64, grade: "C4", remark: "Credit" },
  { minScore: 55, maxScore: 59, grade: "C5", remark: "Credit" },
  { minScore: 50, maxScore: 54, grade: "C6", remark: "Credit" },
  { minScore: 45, maxScore: 49, grade: "D7", remark: "Pass" },
  { minScore: 40, maxScore: 44, grade: "E8", remark: "Pass" },
  { minScore: 0, maxScore: 39, grade: "F9", remark: "Fail" },
];

export async function gradeFor(total: number): Promise<{ grade: string; remark: string }> {
  const bands = await prisma.gradeBand.findMany({ orderBy: { minScore: "desc" } });
  const match = bands.find((b) => total >= b.minScore && total <= b.maxScore);
  if (match) return { grade: match.grade, remark: match.remark };
  return { grade: "-", remark: "Ungraded" };
}
