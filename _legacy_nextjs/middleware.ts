import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

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

// Signature-verifying role extraction. Fails closed on any error.
async function roleFromToken(token: string | undefined): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] }
    );
    if (typeof payload.role === "string") return payload.role;
    if (typeof payload.user_type === "string") return payload.user_type;
    return null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  const role = await roleFromToken(token);

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
      role === "admin"    ? "/admin/dashboard"    :
      role === "staff"    ? "/staff/dashboard"    :
      role === "guardian" ? "/guardian/dashboard" :
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
