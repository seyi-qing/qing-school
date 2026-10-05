import { SCHOOL } from "@/lib/school-config";

/** Print-ready school letterhead + stamp area for receipts and report cards. */
export function OfficialLetterhead({
  documentTitle,
}: {
  documentTitle: string;
  showStamp?: boolean;
}) {
  return (
    <header className="text-center mb-6 border-b-2 border-navy pb-4">
      <div className="flex items-center justify-center gap-3 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt=""
          className="h-14 w-14 object-contain print:h-16 print:w-16"
        />
        <div className="text-left">
          <p className="font-serif text-xl sm:text-2xl text-navy leading-tight">{SCHOOL.name}</p>
          <p className="text-[11px] sm:text-xs text-ink/60 italic">{SCHOOL.motto}</p>
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-ink/55 leading-relaxed">
        {SCHOOL.contact.address}
        <br />
        Tel: {SCHOOL.contact.phone}
        {SCHOOL.contact.phoneAlt ? ` / ${SCHOOL.contact.phoneAlt}` : ""} · {SCHOOL.contact.email}
      </p>
      <p className="text-sm font-semibold mt-3 uppercase tracking-widest text-navy">{documentTitle}</p>
    </header>
  );
}

export function OfficialStampArea() {
  return (
    <div className="mt-10 pt-6 border-t border-line grid grid-cols-2 gap-6 text-xs text-ink/50">
      <div>
        <p className="mb-8">Prepared by</p>
        <p className="border-t border-ink/30 pt-1">Bursar / Accounts</p>
      </div>
      <div className="text-right">
        <div className="inline-block border border-dashed border-ink/30 w-28 h-28 rounded-full text-center leading-[7rem] text-[10px] text-ink/40">
          School stamp
        </div>
        <p className="mt-2 border-t border-ink/30 pt-1">Authorised signature</p>
      </div>
    </div>
  );
}
