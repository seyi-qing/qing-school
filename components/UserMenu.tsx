"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Header account menu: profile, change password, sign out.
 * Replaces a lone Sign out control so admins manage account in one place.
 */
export function UserMenu({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const label = email ? email.split("@")[0] : "Account";

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs sm:text-sm border border-line bg-white px-2.5 py-1.5 text-ink/80 hover:border-navy max-w-[10rem] sm:max-w-[14rem]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="truncate">{label}</span>
        <span className="text-ink/40" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-52 bg-white border border-line shadow-lg z-50 py-1 text-sm"
        >
          {email && (
            <p className="px-3 py-2 text-[11px] text-ink/50 border-b border-line break-all">{email}</p>
          )}
          <Link
            href="/account/profile"
            role="menuitem"
            className="block px-3 py-2 text-ink hover:bg-paper"
            onClick={() => setOpen(false)}
          >
            Profile & details
          </Link>
          <Link
            href="/account/password"
            role="menuitem"
            className="block px-3 py-2 text-ink hover:bg-paper"
            onClick={() => setOpen(false)}
          >
            Change password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="w-full text-left px-3 py-2 text-brick hover:bg-brick/5 border-t border-line"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
