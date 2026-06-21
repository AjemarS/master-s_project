import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin"];

// Role-based route access map.
// Admin always has access to all protected routes.
const roleRouteAccess: Record<string, string[]> = {
  "/admin": ["admin", "cashier", "warehouse_worker"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const authUrl = process.env.PROXY_AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";
    const response = await fetch(`${authUrl}/me`, {
      headers: { cookie: cookieHeader },
      redirect: "manual",
    });

    if (response.status !== 200) return redirectToSignIn(request);

    const session = await response.json();
    if (!session?.user) return redirectToSignIn(request);

    const userRole = session.user.role;

    // Check role-based route access
    for (const [route, allowedRoles] of Object.entries(roleRouteAccess)) {
      if (pathname.startsWith(route)) {
        if (userRole !== "admin" && !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
        break;
      }
    }

    return NextResponse.next();
  } catch {
    // Fail closed for admin panel (security), fail open for dashboard (availability)
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
}

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};