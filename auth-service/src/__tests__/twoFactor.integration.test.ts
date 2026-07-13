import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockEnableTwoFactor = vi.hoisted(() => vi.fn());
const mockDisableTwoFactor = vi.hoisted(() => vi.fn());
const mockPool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockRedis = vi.hoisted(() => ({ status: "ready", ping: vi.fn(), on: vi.fn(), quit: vi.fn() }));

vi.mock("../auth", () => ({
  auth: { api: { getSession: mockGetSession, enableTwoFactor: mockEnableTwoFactor, disableTwoFactor: mockDisableTwoFactor } },
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
  requireAuth: mockRequireAuth,
  requireAdmin: vi.fn((_r: any, _s: any, n: any) => n()),
  getAdminUserIds: vi.fn(() => []),
  addAdminUserId: vi.fn(),
}));

import { createApp } from "../index.js";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockImplementation((_: any, __: any, next: any) => next());
});

describe("POST /auth/two-factor/enable", () => {
  it("returns 200 with valid session and body", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });
    mockEnableTwoFactor.mockResolvedValue({});

    const res = await request(app).post("/auth/two-factor/enable").send({ password: "mypassword" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
    expect(mockEnableTwoFactor).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ password: "mypassword" }) }),
    );
  });

  it("includes optional issuer when provided", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });
    mockEnableTwoFactor.mockResolvedValue({});

    await request(app).post("/auth/two-factor/enable").send({ password: "mypassword", issuer: "TechHub" });
    expect(mockEnableTwoFactor).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ issuer: "TechHub" }) }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockImplementationOnce((_: any, res: any, __: any) => {
      res.status(401).json({ message: "Authentication required" });
    });

    const res = await request(app).post("/auth/two-factor/enable").send({ password: "mypassword" });
    expect(res.status).toBe(401);
    expect(mockEnableTwoFactor).not.toHaveBeenCalled();
  });

  it("returns 400 with missing password", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });

    const res = await request(app).post("/auth/two-factor/enable").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("returns 400 when 2FA API throws", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });
    mockEnableTwoFactor.mockRejectedValue(new Error("Invalid password"));

    const res = await request(app).post("/auth/two-factor/enable").send({ password: "wrongpassword" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/two-factor/disable", () => {
  it("returns 200 with valid session and password", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });
    mockDisableTwoFactor.mockResolvedValue({});

    const res = await request(app).post("/auth/two-factor/disable").send({ password: "mypassword" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("returns 400 with missing password", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "user" }, session: { token: "sess-1" } });

    const res = await request(app).post("/auth/two-factor/disable").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockImplementationOnce((_: any, res: any, __: any) => {
      res.status(401).json({ message: "Authentication required" });
    });

    const res = await request(app).post("/auth/two-factor/disable").send({ password: "mypassword" });
    expect(res.status).toBe(401);
  });
});
