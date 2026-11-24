const test = require("node:test");
const assert = require("node:assert/strict");

// Re-create the exact rate limiter algorithm from proxy.ts
function createRateLimiter() {
  const store = new Map();
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup > 60000) {
      lastCleanup = now;
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
          store.delete(key);
        }
      }
    }
  }

  function getLimit(pathname) {
    if (pathname.startsWith("/api/maintenance")) return 30;
    if (
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/register") ||
      pathname.startsWith("/api/auth/forgot-password") ||
      pathname.startsWith("/api/auth/reset-password")
    ) {
      return 15;
    }
    if (
      pathname.startsWith("/api/invoices") ||
      pathname.startsWith("/api/credit-sales") ||
      pathname.startsWith("/api/orders") ||
      pathname.startsWith("/api/stock") ||
      pathname.startsWith("/api/inventory")
    ) {
      return 60;
    }
    if (
      pathname.startsWith("/api/products") ||
      pathname.startsWith("/api/categories") ||
      pathname.startsWith("/api/auth/me")
    ) {
      return 100;
    }
    return 45;
  }

  function check(key, limit, windowMs = 60000) {
    cleanup();
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, retryAfter: 0, count: 1 };
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter), count: record.count };
    }

    record.count += 1;
    return { allowed: true, retryAfter: 0, count: record.count };
  }

  return { getLimit, check, store };
}

test("Rate limiter assigns correct thresholds per path", () => {
  const limiter = createRateLimiter();
  assert.equal(limiter.getLimit("/api/auth/login"), 15, "Auth route should have 15 req/min");
  assert.equal(limiter.getLimit("/api/invoices/123"), 60, "Invoice route should have 60 req/min");
  assert.equal(limiter.getLimit("/api/inventory/defective"), 60, "Inventory route should have 60 req/min");
  assert.equal(limiter.getLimit("/api/products"), 100, "Products browse should have 100 req/min");
  assert.equal(limiter.getLimit("/api/unknown"), 45, "Default route should have 45 req/min");
});

test("Rate limiter blocks when threshold is exceeded", () => {
  const limiter = createRateLimiter();
  const ip = "192.168.1.10";
  const path = "/api/invoices";
  const limit = limiter.getLimit(path); // 60

  // First 60 requests should succeed
  for (let i = 1; i <= limit; i++) {
    const res = limiter.check(`${ip}:${path}`, limit, 60000);
    assert.equal(res.allowed, true, `Request ${i} should be allowed`);
    assert.equal(res.count, i);
  }

  // 61st request should be blocked
  const blockedRes = limiter.check(`${ip}:${path}`, limit, 60000);
  assert.equal(blockedRes.allowed, false, "Request 61 should be blocked");
  assert.ok(blockedRes.retryAfter > 0, "Retry-After should be > 0");
});

test("Rate limiter resets after window expires", () => {
  const limiter = createRateLimiter();
  const key = "127.0.0.1:/api/test";
  const now = Date.now();

  // Simulate an expired record
  limiter.store.set(key, { count: 10, resetTime: now - 1000 });

  const res = limiter.check(key, 5, 60000);
  assert.equal(res.allowed, true, "Should allow request after window expired");
  assert.equal(res.count, 1, "Count should be reset to 1");
});
