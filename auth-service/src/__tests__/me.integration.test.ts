import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockListUserSessions = vi.hoisted(() => vi.fn());
const mockPool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));

vi.mock("../auth", () => ({
  auth: { api: { getSession: mockGetSession, listUserSessions: mockListUserSessions } },
  pool: mockPool,
}));
vi.mock("../middleware/rateLimiter", () => ({
  redisClient: { status: "ready", ping: vi.fn(), on: vi.fn(), quit: vi.fn() },
  checkLoginRateLimit: vi.fn(), recordFailedAttempt: vi.fn(), resetLoginRateLimit: vi.fn(), initRateLimiter: vi.fn(),
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

describe("GET /auth/me", () => {
  it("returns session with X-User headers when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", role: "admin", email: "admin@test.com", name: "Admin" }, session: { token: "sess-1" } });

    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-1");
    expect(res.headers["x-user-id"]).toBe("user-1");
    expect(res.headers["x-user-role"]).toBe("admin");
    expect(res.headers["x-user-email"]).toBe("admin@test.com");
    expect(res.headers["x-user-name"]).toBe("Admin");
  });

  it("returns null body and no X-User headers when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
    expect(res.headers["x-user-id"]).toBeUndefined();
  });

  it("uses default 'user' role when role is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "test@test.com", name: "Test" }, session: { token: "sess-1" } });

    const res = await request(app).get("/auth/me");
    expect(res.headers["x-user-role"]).toBe("user");
  });

  it("handles minimal user object with only id", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" }, session: { token: "sess-1" } });

    const res = await request(app).get("/auth/me");
    expect(res.headers["x-user-id"]).toBe("user-1");
    expect(res.headers["x-user-role"]).toBe("user");
    expect(res.headers["x-user-email"]).toBeUndefined();
    expect(res.headers["x-user-name"]).toBeUndefined();
  });
});

describe("GET /auth/sessions", () => {
  it("lists own sessions when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" }, session: { token: "sess-1" } });
    mockListUserSessions.mockResolvedValue({ sessions: [{ id: "s1", token: "t1" }, { id: "s2", token: "t2" }] });

    const res = await request(app).get("/auth/sessions");
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAuth } = await import("../middleware/authMiddleware.js");
    (requireAuth as any).mockImplementationOnce((_: any, res: any, __: any) => {
      res.status(401).json({ success: false, message: "Authentication required" });
    });

    const res = await request(app).get("/auth/sessions");
    expect(res.status).toBe(401);
  });
});

describe("CSRF / CORS protection", () => {
  it("rejects POST from disallowed Origin", async () => {
    const res = await request(app)
      .post("/auth/two-factor/enable")
      .set("Origin", "https://evil.com")
      .send({ password: "mypassword" });
    expect(res.status).toBe(403);
  });

  it("allows POST from allowed Origin", async () => {
    const res = await request(app)
      .post("/auth/two-factor/enable")
      .set("Origin", "http://localhost")
      .send({ password: "mypassword" });
    expect(res.status).not.toBe(403);
  });

  it("allows POST without Origin/Referer (programmatic client)", async () => {
    const res = await request(app).post("/auth/two-factor/enable").send({ password: "mypassword" });
    expect(res.status).not.toBe(403);
  });
});
