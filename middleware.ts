import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/result-checker",
  "/api/setup",
  "/api/admissions",
  "/api/complaints",
  "/api/webhooks",
  "/api/fees/payments/confirm",
  "/",
  "/admissions",
  "/complaints",
  "/result-checker",
  "/pay",
  "/p",
  "/onboarding",
  "/api/onboarding",
];

const PORTAL_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/portal/student", roles: ["STUDENT"] },
  { prefix: "/portal/parent", roles: ["PARENT"] },
  { prefix: "/portal/teacher", roles: ["TEACHER"] },
  { prefix: "/staff", roles: ["ADMIN", "IT"] },
  { prefix: "/payroll", roles: ["ADMIN", "ACCOUNTANT"] },
  { prefix: "/settings", roles: ["ADMIN", "IT", "PRINCIPAL"] },
];

async function getSessionFromCookie(req: NextRequest): Promise<{
  role: string | null;
  mustChangePassword: boolean;
}> {
  const token = req.cookies.get("kms_session")?.value;
  if (!token) return { role: null, mustChangePassword: false };
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    return {
      role: (payload.role as string) ?? null,
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return { role: null, mustChangePassword: false };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = req.headers.get("host") || "";
  const hostNoPort = host.split(":")[0];
  const hostParts = hostNoPort.split(".");
  let schoolSlug: string | null = null;
  if (hostParts.length >= 3 && !["www", "app", "api"].includes(hostParts[0])) {
    schoolSlug = hostParts[0];
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next")
  ) {
    const res = NextResponse.next();
    if (schoolSlug) res.headers.set("x-school-slug", schoolSlug);
    return res;
  }

  const { role, mustChangePassword } = await getSessionFromCookie(req);

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    mustChangePassword &&
    !pathname.startsWith("/account/password") &&
    !pathname.startsWith("/api/auth/change-password") &&
    !pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.redirect(new URL("/account/password", req.url));
  }

  for (const rule of PORTAL_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      if (!rule.roles.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  const res = NextResponse.next();
  if (schoolSlug) res.headers.set("x-school-slug", schoolSlug);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$).*)"],
};
