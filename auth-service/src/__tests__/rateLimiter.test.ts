import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  ttl: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
  connect: vi.fn(),
  script: vi.fn(),
  evalsha: vi.fn(),
  eval: vi.fn(),
};

function MockRedis(_url: string, _opts: Record<string, unknown>) {
  return mockRedis as any;
}
vi.mock("ioredis", () => ({ default: MockRedis }));

vi.mock("../logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("checkLoginRateLimit", () => {
  it("allows when no block exists", async () => {
    mockRedis.ttl.mockResolvedValue(-2);
    const { checkLoginRateLimit } = await import("../middleware/rateLimiter.js");
    const result = await checkLoginRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("blocks when block TTL is positive", async () => {
    mockRedis.ttl.mockResolvedValue(60);
    const { checkLoginRateLimit } = await import("../middleware/rateLimiter.js");
    const result = await checkLoginRateLimit("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });
});

describe("recordFailedAttempt (Lua eval path)", () => {
  it("returns not blocked for first attempt", async () => {
    mockRedis.eval.mockResolvedValue([0, 0]);
    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");
    expect(result.blocked).toBe(false);
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it("blocks for 1 minute after 5 attempts", async () => {
    mockRedis.eval.mockResolvedValue([1, 60]);
    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");
    expect(result.blocked).toBe(true);
    expect(result.blockDuration).toBe(60);
  });

  it("blocks for 5 minutes after 10 attempts", async () => {
    mockRedis.eval.mockResolvedValue([1, 300]);
    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");
    expect(result.blocked).toBe(true);
    expect(result.blockDuration).toBe(300);
  });

  it("blocks for 30 minutes after 20 attempts", async () => {
    mockRedis.eval.mockResolvedValue([1, 1800]);
    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");
    expect(result.blocked).toBe(true);
    expect(result.blockDuration).toBe(1800);
  });

  it("blocks for 1 hour after 50+ attempts", async () => {
    mockRedis.eval.mockResolvedValue([1, 3600]);
    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");
    expect(result.blocked).toBe(true);
    expect(result.blockDuration).toBe(3600);
  });
});

describe("recordFailedAttempt (non-atomic fallback)", () => {
  it("falls back to incr/expire/setex when eval fails", async () => {
    mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
    mockRedis.incr.mockResolvedValue(10);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.setex.mockResolvedValue("OK");

    const { recordFailedAttempt } = await import("../middleware/rateLimiter.js");
    const result = await recordFailedAttempt("1.2.3.4");

    expect(result.blocked).toBe(true);
    expect(result.blockDuration).toBe(300);
    expect(mockRedis.incr).toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalled();
  });
});

describe("resetLoginRateLimit", () => {
  it("deletes attempt and block keys", async () => {
    mockRedis.del.mockResolvedValue(1);
    const { resetLoginRateLimit } = await import("../middleware/rateLimiter.js");
    await resetLoginRateLimit("1.2.3.4");
    expect(mockRedis.del).toHaveBeenCalledTimes(2);
  });
});

describe("checkAdminRateLimit (Lua eval path)", () => {
  it("allows request within rate limit", async () => {
    mockRedis.eval.mockResolvedValue([1, 0]);
    const { checkAdminRateLimit } = await import("../middleware/rateLimiter.js");
    const result = await checkAdminRateLimit("user-1", "1.2.3.4", "GET");
    expect(result.allowed).toBe(true);
  });

  it("blocks when over limit", async () => {
    mockRedis.eval.mockResolvedValue([0, 30]);
    const { checkAdminRateLimit } = await import("../middleware/rateLimiter.js");
    const result = await checkAdminRateLimit("user-1", "1.2.3.4", "POST");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(30);
  });

  it("falls back to non-atomic when eval fails", async () => {
    mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
    mockRedis.incr.mockResolvedValue(35);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(45);

    const { checkAdminRateLimit } = await import("../middleware/rateLimiter.js");
    const result = await checkAdminRateLimit("user-1", "1.2.3.4", "GET");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(45);
  });
});
