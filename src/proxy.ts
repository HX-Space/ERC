import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessView, homeForRole, pathToView } from "@/lib/rbac";

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const isLogin = pathname === "/login";
  const isSetup = pathname === "/setup";

  if (!user?.role) {
    if (isLogin || isSetup) return NextResponse.next();
    const url = new URL("/login", req.nextUrl);
    if (pathname !== "/") {
      url.searchParams.set("callbackUrl", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  // Keep the browser URL on the real module path (never leave users on "/")
  if (isLogin || isSetup || pathname === "/") {
    const home = homeForRole(user.role);
    if (pathname !== home) {
      return NextResponse.redirect(new URL(home, req.nextUrl));
    }
  }

  const view = pathToView(pathname);
  if (view && !canAccessView(user.role, view)) {
    return NextResponse.redirect(new URL(homeForRole(user.role), req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
