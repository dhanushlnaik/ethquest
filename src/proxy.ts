import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: the real authorization check happens server-side in requireAdmin/requireAdminPage.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/booth-admin") && pathname !== "/booth-admin/login" && !request.cookies.has("eq_admin")) {
    const url = new URL("/booth-admin/login", request.url);
    if (pathname === "/booth-admin/scan" && search) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets|icons|sw.js|manifest.webmanifest).*)"],
};
