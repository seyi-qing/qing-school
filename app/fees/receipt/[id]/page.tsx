import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { notFound } from "next/navigation";
import { formatNaira } from "@/lib/format";
import { OfficialLetterhead, OfficialStampArea } from "@/components/OfficialLetterhead";
import { SCHOOL } from "@/lib/school-config";
import Link from "next/link";
import { PrintReceiptButton } from "./PrintReceiptButton";

export const dynamic = "force-dynamic";

export default async function PaymentReceiptPage({ params }: { params: { id: string } }) {
  await requireSession();

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      student: { include: { arm: { include: { schoolClass: true } } } },
      invoice: { include: { term: true } },
    },
  });
  if (!payment) notFound();

  const classLabel = payment.student.arm
    ? `${payment.student.arm.schoolClass.name} ${payment.student.arm.name}`
    : "-";
  const balance = payment.invoice.totalAmount - payment.invoice.amountPaid;

  return (
    <div className="max-w-lg mx-auto p-6 sm:p-10 font-sans text-ink report-card-print">
      <div className="no-print mb-4 flex justify-between gap-3">
        <Link href="/fees" className="text-sm text-navy underline">
          Back to Fees
        </Link>
        <PrintReceiptButton />
      </div>

      <div className="border border-line bg-white p-6 print:border-0">
        <OfficialLetterhead documentTitle="Payment receipt" />

        <dl className="text-sm space-y-2">
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Receipt / Ref</dt>
            <dd className="font-mono text-xs">{payment.reference}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Date</dt>
            <dd>{payment.paidAt.toLocaleString("en-NG")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Student</dt>
            <dd>
              {payment.student.lastName}, {payment.student.firstName}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Admission No.</dt>
            <dd className="font-mono">{payment.student.admissionNumber}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Class</dt>
            <dd>{classLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Term</dt>
            <dd>{payment.invoice.term.name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Method</dt>
            <dd>{payment.method}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Amount paid</dt>
            <dd className="font-medium text-sage">{formatNaira(payment.amount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Invoice total</dt>
            <dd>{formatNaira(payment.invoice.totalAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-1">
            <dt className="text-ink/50">Balance after payment</dt>
            <dd className={balance > 0 ? "text-brick" : "text-sage"}>{formatNaira(balance)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-ink/50">Status</dt>
            <dd>{payment.invoice.status}</dd>
          </div>
        </dl>

        <OfficialStampArea />

        <p className="text-[10px] text-ink/40 mt-6 text-center">
          Computer-generated receipt · {SCHOOL.shortName} · Keep for your records
        </p>
      </div>
    </div>
  );
}
