// proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const HTTP_URL = process.env.NEXT_PUBLIC_HTTP_URL;

export function proxy(request: NextRequest) {
  const token = request.cookies.get("__uIt")?.value;
  const { pathname } = request.nextUrl;

  let isAuthenticated = false;

  if (token) {
    isAuthenticated = true;
  }

  // If authenticated and trying to access /signin or /signup, redirect to /dashboard
  if (isAuthenticated && (pathname === "/signin" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If NOT authenticated and trying to access protected routes, redirect to /signin
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

// Define which paths middleware should run on
export const config = {
  matcher: ["/signin", "/signup", "/dashboard/:path*"],
};
