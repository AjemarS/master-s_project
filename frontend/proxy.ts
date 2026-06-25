import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["ua", "en"],
  defaultLocale: "ua",
  localePrefix: "always",
});

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin"];

// Role-based route access map
const roleRouteAccess: Record<string, string[]> = {
  "/admin": ["admin", "cashier", "warehouse_worker"],
};

async function redirectToSignIn(request: NextRequest) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "ua";
  const signInUrl = new URL(`/${locale}/sign-in`, request.url);
  signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export async function proxy(request: NextRequest) {
  // Step 1: Handle i18n locale detection via next-intl
  const intlResponse = await intlMiddleware(request);
  if (intlResponse) return intlResponse;

  const { pathname } = request.nextUrl;

  // Step 2: Check if the route needs auth
  const localePath = pathname.replace(/^\/(ua|en)/, "");
  const isProtected = protectedRoutes.some((route) => localePath.startsWith(route));
  if (!isProtected) return NextResponse.next();

  // Step 3: Auth check
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

    // Role-based access
    const userRole = session.user.role || "user";
    for (const [route, allowedRoles] of Object.entries(roleRouteAccess)) {
      if (localePath.startsWith(route) && !allowedRoles.includes(userRole) && userRole !== "admin") {
        return redirectToSignIn(request);
      }
    }

    return NextResponse.next();
  } catch {
    return redirectToSignIn(request);
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
