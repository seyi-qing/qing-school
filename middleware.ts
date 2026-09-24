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
];

const PORTAL_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/portal/student", roles: ["STUDENT"] },
  { prefix: "/portal/parent", roles: ["PARENT"] },
  { prefix: "/portal/teacher", roles: ["TEACHER"] },
  { prefix: "/staff", roles: ["ADMIN", "IT"] },
  { prefix: "/payroll", roles: ["ADMIN", "ACCOUNTANT"] },
  { prefix: "/settings", roles: ["ADMIN", "IT", "PRINCIPAL"] },
];

async function getRoleFromCookie(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("force_schools_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const role = await getRoleFromCookie(req);

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rule = PORTAL_RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
