import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockImpersonateUser = vi.hoisted(() => vi.fn());
const mockStopImpersonating = vi.hoisted(() => vi.fn());
const mockPool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
const mockRedis = vi.hoisted(() => ({ status: "ready", ping: vi.fn(), on: vi.fn(), quit: vi.fn(), get: vi.fn(), setex: vi.fn(), del: vi.fn() }));

vi.mock("../auth", () => ({
  auth: { api: { getSession: mockGetSession, impersonateUser: mockImpersonateUser, stopImpersonating: mockStopImpersonating } },
  pool: mockPool,
}));
vi.mock("../middleware/rateLimiter", () => ({
  redisClient: mockRedis, checkLoginRateLimit: vi.fn(), recordFailedAttempt: vi.fn(), resetLoginRateLimit: vi.fn(), initRateLimiter: vi.fn(),
  adminRateLimit: vi.fn((_: any, __: any, n: any) => n()),
}));
vi.mock("../logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("../email/sender", () => ({
  sendVerificationEmail: vi.fn(), sendResetPasswordEmail: vi.fn(), sendImpersonationCode: vi.fn(),
}));
vi.mock("../middleware/authMiddleware", () => ({
  requireAuth: vi.fn((_: any, __: any, n: any) => n()),
  requireAdmin: vi.fn((_: any, __: any, n: any) => n()),
  getAdminUserIds: vi.fn(() => []), addAdminUserId: vi.fn(),
}));

import { createApp } from "../index.js";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /auth/admin/impersonate", () => {
  it("starts impersonation with valid userId", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "admin-1", role: "admin" }, session: { token: "admin-sess" } });
    mockPool.query.mockResolvedValue({ rows: [{ id: "target-1" }] });
    mockImpersonateUser.mockResolvedValue({ user: { id: "target-1", name: "Target" }, headers: {} });

    const res = await request(app).post("/auth/admin/impersonate").send({ userId: "target-1" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Impersonation started");
  });

  it("returns 400 when userId missing", async () => {
    const res = await request(app).post("/auth/admin/impersonate").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("userId is required");
  });

  it("returns 404 when target user not found", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).post("/auth/admin/impersonate").send({ userId: "nonexistent" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("returns 500 when impersonate API fails", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "admin-1", role: "admin" }, session: { token: "admin-sess" } });
    mockPool.query.mockResolvedValue({ rows: [{ id: "target-1" }] });
    mockImpersonateUser.mockRejectedValue(new Error("Impersonation failed"));

    const res = await request(app).post("/auth/admin/impersonate").send({ userId: "target-1" });
    expect(res.status).toBe(500);
  });
});

describe("POST /auth/admin/stop-impersonation", () => {
  it("stops impersonation", async () => {
    mockStopImpersonating.mockResolvedValue({ headers: {} });

    const res = await request(app).post("/auth/admin/stop-impersonation");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Impersonation stopped");
  });

  it("returns 500 on failure", async () => {
    mockStopImpersonating.mockRejectedValue(new Error("Stop failed"));

    const res = await request(app).post("/auth/admin/stop-impersonation");
    expect(res.status).toBe(500);
  });
});

describe("POST /auth/impersonate/request-code", () => {
  it("requests code for valid email", async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: "user-1", name: "User", email: "user@test.com" }] });
    mockRedis.setex.mockResolvedValue("OK");

    const res = await request(app).post("/auth/impersonate/request-code").send({ userEmail: "user@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Код надіслано на email");
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it("returns 400 when userEmail missing", async () => {
    const res = await request(app).post("/auth/impersonate/request-code").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).post("/auth/impersonate/request-code").send({ userEmail: "nonexistent@test.com" });
    expect(res.status).toBe(404);
  });
});

describe("POST /auth/impersonate/verify-code", () => {
  it("verifies valid code and starts impersonation", async () => {
    mockRedis.get.mockResolvedValue("123456");
    mockPool.query.mockResolvedValue({ rows: [{ id: "user-1" }] });
    mockImpersonateUser.mockResolvedValue({ user: { id: "user-1", name: "User" }, headers: {} });

    const res = await request(app).post("/auth/impersonate/verify-code").send({ userEmail: "user@test.com", code: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Impersonation started");
  });

  it("returns 400 when code expired", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPool.query.mockResolvedValue({ rows: [{ id: "user-1" }] });

    const res = await request(app).post("/auth/impersonate/verify-code").send({ userEmail: "user@test.com", code: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No code requested or code expired");
  });

  it("returns 400 when code is wrong", async () => {
    mockRedis.get.mockResolvedValue("123456");

    const res = await request(app).post("/auth/impersonate/verify-code").send({ userEmail: "user@test.com", code: "999999" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid code");
  });

  it("returns 400 when userEmail or code missing", async () => {
    const res = await request(app).post("/auth/impersonate/verify-code").send({});
    expect(res.status).toBe(400);
  });
});
