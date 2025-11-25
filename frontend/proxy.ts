import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Публічні маршрути
  const publicPaths = ["/login", "/register", "/"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Отримання токену сесії з cookies
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  // Якщо немає токену і користувач на захищених сторінках
  if (!sessionToken && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Якщо є токен і користувач на публічних сторінках
  if (sessionToken && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
