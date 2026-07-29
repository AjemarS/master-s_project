import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["ua", "en"],
  defaultLocale: "ua",
  localePrefix: "always",
  localeDetection: false,
});

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin", "/order", "/my"];

// Role-based route access map
// More specific paths are checked first (longest match wins)
// Must stay in sync with gateway RBAC (nginx/auth.js) and admin-sidebar.tsx
const roleRouteAccess: Record<string, string[]> = {
  "/admin/summary": ["admin", "cashier", "warehouse_worker"],
  "/admin/pos": ["admin", "cashier"],
  "/admin/products": ["admin", "cashier"],
  "/admin/orders": ["admin", "cashier"],
  "/admin/warehouses": ["admin", "warehouse_worker"],
  "/admin/stock-movements": ["admin", "warehouse_worker"],
  "/admin/goods-receipts": ["admin", "warehouse_worker"],
  "/admin/suppliers": ["admin", "warehouse_worker"],
  "/admin/categories": ["admin"],
  "/admin/users": ["admin"],
  "/admin/reports": ["admin"],
};

async function redirectToSignIn(request: NextRequest) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "ua";
  const signInUrl = new URL(`/${locale}/sign-in`, request.url);
  signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1: Check if the route needs auth (BEFORE i18n processing)
  const localePath = pathname.replace(/^\/(ua|en)/, "");
  const isProtected = protectedRoutes.some((route) => localePath.startsWith(route));

  if (isProtected) {
    // Auth check
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
      let matchedRoute = false;
      for (const [route, allowedRoles] of Object.entries(roleRouteAccess)) {
        if (localePath.startsWith(route)) {
          matchedRoute = true;
          if (!allowedRoles.includes(userRole) && userRole !== "admin") {
            return redirectToSignIn(request);
          }
        }
      }

      // Catch-all: any /admin/* route not explicitly mapped requires admin
      if (!matchedRoute && localePath.startsWith("/admin") && userRole !== "admin") {
        return redirectToSignIn(request);
      }
    } catch {
      return redirectToSignIn(request);
    }
  }

  // Step 2: Handle i18n locale detection via next-intl
  const intlResponse = await intlMiddleware(request);
  if (intlResponse) return intlResponse;

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
