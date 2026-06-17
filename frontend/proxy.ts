import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin"];

// Routes that require admin role
const adminRoutes = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAdmin = adminRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Forward the auth check to the auth service via the gateway
  try {
    // Forward cookies to check session
    const cookieHeader = request.headers.get("cookie") || "";
    
    // Use a server-side URL through gateway.
    // PROXY_AUTH_URL (server-side, through gateway, set in docker-compose)
    //   → Docker: http://gateway:8080/auth
    //   → Local:  http://localhost/auth
    // NEXT_PUBLIC_AUTH_URL (browser-facing, through gateway, for backwards compat)
    const authUrl = process.env.PROXY_AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth";
    const response = await fetch(`${authUrl}/me`, {
      headers: { cookie: cookieHeader },
      // Don't follow redirects
      redirect: "manual",
    });

    // If the response is not 200, the user is not authenticated
    if (response.status !== 200) {
      return redirectToSignIn(request);
    }

    const session = await response.json();

    if (!session?.user) {
      return redirectToSignIn(request);
    }

    // For admin routes, verify admin role
    if (isAdmin && session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    // If auth service is unreachable, fail closed for admin routes (security)
    // Fail open for dashboard routes (availability)
    if (isAdmin) {
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