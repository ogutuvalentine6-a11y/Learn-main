import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/", "/login", "/register", "/forgot-password",
  "/courses", "/instructors", "/about", "/contact",
  "/admissions", "/careers", "/events",
]);

const ROLE_PREFIX: Record<string, string> = {
  "/student": "student",
  "/staff":   "staff",
  "/admin":   "admin",
  "/guardian":"guardian",
};

function roleFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.role === "string"
      ? payload.role
      : typeof payload?.user_type === "string" ? payload.user_type : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  const role = roleFromToken(token);

  if (!token || !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const requiredRole = Object.entries(ROLE_PREFIX).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/")
  )?.[1];

  if (requiredRole && role !== requiredRole) {
    const fallback =
      role === "admin"   ? "/admin/dashboard"   :
      role === "staff"   ? "/staff/dashboard"   :
      role === "guardian"? "/guardian/dashboard":
                           "/student/dashboard";
    const url = req.nextUrl.clone();
    url.pathname = fallback;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/staff/:path*", "/admin/:path*", "/guardian/:path*"],
};
