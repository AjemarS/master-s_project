import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockPool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
const mockRedis = vi.hoisted(() => ({ status: "ready", ping: vi.fn(), on: vi.fn(), quit: vi.fn() }));

vi.mock("../auth", () => ({ pool: mockPool, auth: { api: {} } }));
vi.mock("../middleware/rateLimiter", () => ({
  redisClient: mockRedis,
  checkLoginRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetLoginRateLimit: vi.fn(),
  initRateLimiter: vi.fn(),
  adminRateLimit: vi.fn((_: any, __: any, n: any) => n()),
}));
vi.mock("../logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("../email/sender", () => ({
  sendVerificationEmail: vi.fn(), sendResetPasswordEmail: vi.fn(), sendImpersonationCode: vi.fn(),
}));

import { createApp } from "../index.js";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPool.query.mockReset();
  mockRedis.ping.mockReset();
  mockRedis.status = "ready";
});

describe("GET /health", () => {
  it("returns 200 when DB and Redis are OK", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    mockRedis.ping.mockResolvedValue("PONG");

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "healthy", service: "auth-service", checks: { database: "ok", redis: "ok" } });
  });

  it("returns 503 when DB fails", async () => {
    mockPool.query.mockRejectedValue(new Error("DB error"));
    mockRedis.ping.mockResolvedValue("PONG");

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("error");
    expect(res.body.checks.redis).toBe("ok");
  });

  it("returns 503 when Redis is disconnected", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    mockRedis.status = "disconnected";

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.checks.redis).toBe("disconnected");
  });

  it("returns 503 when Redis ping fails", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    mockRedis.status = "ready";
    mockRedis.ping.mockRejectedValue(new Error("Redis down"));

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.checks.redis).toBe("error");
  });

  it("returns 503 when both DB and Redis fail", async () => {
    mockPool.query.mockRejectedValue(new Error("DB error"));
    mockRedis.status = "disconnected";

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("error");
    expect(res.body.checks.redis).toBe("disconnected");
  });
});
