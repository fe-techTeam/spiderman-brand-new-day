// Next.js 16 proxy (replaces middleware.js; Node runtime). Optimistic guard for
// the admin panel: verifies the admin JWT signature only — no DB. The real
// security boundary is the DAL check in every /api/admin handler and the admin
// layout. See BACKEND.md §2 / §5.3.

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "bnd_admin_session";

async function hasValidAdminToken(request) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.ADMIN_JWT_SECRET), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  // Pre-auth pages: login + the self-service password-reset flow.
  const isPublic = isLogin || pathname === "/admin/forgot-password" || pathname === "/admin/reset-password";
  const authed = await hasValidAdminToken(request);

  if (!authed && !isPublic) {
    const url = new URL("/admin/login", request.nextUrl);
    return NextResponse.redirect(url);
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only — /api/admin/* handlers do their own (stronger) verification
  // and must return JSON 401s, not redirects.
  matcher: ["/admin", "/admin/:path*"],
};
