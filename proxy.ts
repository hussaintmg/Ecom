import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

const getPayload = async (token: string) => {
  try {
    const { payload } = await jwtVerify(
      new TextEncoder().encode(token),
      new TextEncoder().encode(JWT_SECRET),
    );
    return payload as any;
  } catch (error) {
    return null;
  }
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;

  const user = token ? await getPayload(token) : null;

  // AUTH PROTECTION: If user is logged in, prevent access to auth pages
  const authPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  if (user && authPages.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin/Owner protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/owner")) {
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Reject if not approved
    if (user.status !== "Approved") {
      const response = NextResponse.redirect(
        new URL(
          "/?message=Your+account+is+pending+approval.+Please+wait+for+an+owner+to+approve+you.",
          req.url,
        ),
      );
      response.cookies.delete("auth_token");
      return response;
    }
  }

  // Dashboard Redirects
  if (pathname === "/dashboard") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (user.role === "owner") {
      if (user.status !== "Approved") {
        return NextResponse.redirect(
          new URL(`/?message=Your+owner+account+is+pending+approval.`, req.url),
        );
      }
      return NextResponse.redirect(new URL("/owner/dashboard", req.url));
    }

    if (user.role === "admin") {
      if (user.status !== "Approved") {
        return NextResponse.redirect(
          new URL(
            "/?message=Your+admin+account+is+pending+approval.+Contact+the+owner.",
            req.url,
          ),
        );
      }
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    if (user.role === "user") {
      return NextResponse.redirect(new URL("/user/dashboard", req.url));
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/dashboard",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password/:path*",
  ],
};
