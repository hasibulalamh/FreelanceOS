import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Route protection at the edge: unauthenticated users are redirected before
// any protected server component runs. The dashboard layout re-checks the
// session server-side as defense in depth.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/platforms",
  "/jobs",
  "/ai-studio",
  "/gigs",
  "/proposals",
  "/clients",
  "/portfolio",
  "/research",
  "/analytics",
  "/notifications",
  "/integrations",
  "/settings",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Exclude static assets and API routes (APIs authorize themselves).
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
