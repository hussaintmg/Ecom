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
  } catch {
    return null;
  }
};

// ==========================================
// In-Memory Sliding Window Rate Limiter
// ==========================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastStoreCleanup = Date.now();

function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastStoreCleanup > 60000) {
    lastStoreCleanup = now;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

function getRateLimitForPath(pathname: string): number {
  if (pathname.startsWith("/api/maintenance")) {
    return 30; // Maintenance endpoint
  }
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password")
  ) {
    return 15; // Auth brute-force protection: 15 req/min
  }
  if (
    pathname.startsWith("/api/invoices") ||
    pathname.startsWith("/api/credit-sales") ||
    pathname.startsWith("/api/orders") ||
    pathname.startsWith("/api/stock")
  ) {
    return 30; // Mutation / transaction protection: 30 req/min
  }
  if (
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/categories") ||
    pathname.startsWith("/api/auth/me")
  ) {
    return 100; // Read-heavy & search browsing: 100 req/min
  }
  return 45; // Default for other /api/* endpoints
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  cleanupRateLimits();
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. API Rate Limiting
  if (pathname.startsWith("/api")) {
    const limit = getRateLimitForPath(pathname);
    const clientIp = getClientIp(req);
    const categoryKey = pathname.split("/").slice(0, 4).join("/");
    const limitKey = `${clientIp}:${categoryKey}`;

    const { allowed, retryAfter } = checkRateLimit(limitKey, limit, 60000);

    if (!allowed) {
      const res = NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please slow down and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
      return applySecurityHeaders(res);
    }
  }

  const token = req.cookies.get("auth_token")?.value;
  const user = token ? await getPayload(token) : null;

  // 2. AUTH PROTECTION: If user is logged in, prevent access to auth pages
  const authPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  if (user && authPages.some((p) => pathname.startsWith(p))) {
    const redirectRes = NextResponse.redirect(new URL("/dashboard", req.url));
    return applySecurityHeaders(redirectRes);
  }

  // 3. Admin/Owner protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/owner")) {
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      const redirectRes = NextResponse.redirect(new URL("/login", req.url));
      return applySecurityHeaders(redirectRes);
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
      return applySecurityHeaders(response);
    }
  }

  // 4. Dashboard Redirects
  if (pathname === "/dashboard") {
    if (!user) {
      const redirectRes = NextResponse.redirect(new URL("/login", req.url));
      return applySecurityHeaders(redirectRes);
    }

    if (user.role === "owner") {
      if (user.status !== "Approved") {
        const redirectRes = NextResponse.redirect(
          new URL(`/?message=Your+owner+account+is+pending+approval.`, req.url),
        );
        return applySecurityHeaders(redirectRes);
      }
      const redirectRes = NextResponse.redirect(new URL("/owner/dashboard", req.url));
      return applySecurityHeaders(redirectRes);
    }

    if (user.role === "admin") {
      if (user.status !== "Approved") {
        const redirectRes = NextResponse.redirect(
          new URL(
            "/?message=Your+admin+account+is+pending+approval.+Contact+the+owner.",
            req.url,
          ),
        );
        return applySecurityHeaders(redirectRes);
      }
      const redirectRes = NextResponse.redirect(new URL("/admin/dashboard", req.url));
      return applySecurityHeaders(redirectRes);
    }

    if (user.role === "user") {
      const redirectRes = NextResponse.redirect(new URL("/user/dashboard", req.url));
      return applySecurityHeaders(redirectRes);
    }

    const redirectRes = NextResponse.redirect(new URL("/login", req.url));
    return applySecurityHeaders(redirectRes);
  }

  const nextRes = NextResponse.next();
  return applySecurityHeaders(nextRes);
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
    "/api/:path*",
  ],
};
