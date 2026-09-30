import Link from "next/link";
import { SCHOOL } from "@/lib/school-config";

type LogoProps = {
  variant?: "full" | "mark" | "text";
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
  light?: boolean;
};

const sizes = {
  sm: { img: 36, text: "text-sm", sub: "text-[10px]" },
  md: { img: 44, text: "text-base", sub: "text-[11px]" },
  lg: { img: 56, text: "text-lg", sub: "text-xs" },
};

export function Logo({
  variant = "full",
  size = "md",
  href = "/",
  className = "",
  light = false,
}: LogoProps) {
  const s = sizes[size];
  const textColor = light ? "text-white" : "text-ink";
  const muted = light ? "text-white/70" : "text-ink/55";

  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt={SCHOOL.name}
      width={s.img}
      height={s.img}
      className="object-contain shrink-0"
      style={{ width: s.img, height: s.img }}
    />
  );

  // Header always shows short name (KMS) — full name is for page titles & footer
  const displayName = SCHOOL.shortName;

  const content =
    variant === "mark" ? (
      mark
    ) : variant === "text" ? (
      <div className={`min-w-0 ${textColor}`}>
        <p className={`font-serif font-semibold leading-tight truncate ${s.text}`}>
          {displayName}
        </p>
        <p className={`${s.sub} ${muted} leading-tight truncate`}>{SCHOOL.motto}</p>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 min-w-0">
        {mark}
        <div className={`min-w-0 ${textColor}`}>
          <p className={`font-serif font-semibold leading-tight truncate ${s.text}`}>
            {displayName}
          </p>
          <p className={`${s.sub} ${muted} leading-tight truncate hidden sm:block`}>
            {SCHOOL.motto}
          </p>
        </div>
      </div>
    );

  if (href === null) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label={SCHOOL.name}>
      {content}
    </Link>
  );
}
