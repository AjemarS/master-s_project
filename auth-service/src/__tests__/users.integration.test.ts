import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockRemoveUser = vi.hoisted(() => vi.fn());
const mockListUserSessions = vi.hoisted(() => vi.fn());
const mockSetRole = vi.hoisted(() => vi.fn());
const mockRevokeSession = vi.hoisted(() => vi.fn());
const mockPool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));

vi.mock("../auth", () => ({
  auth: { api: { getSession: mockGetSession, listUsers: mockListUsers, getUser: mockGetUser, createUser: mockCreateUser, adminUpdateUser: mockUpdateUser, removeUser: mockRemoveUser, listUserSessions: mockListUserSessions, setRole: mockSetRole, revokeSession: mockRevokeSession } },
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

describe("GET /auth/admin/users", () => {
  it("returns paginated user list", async () => {
    mockListUsers.mockResolvedValue({ users: [{ id: "1", email: "a@b.com", name: "A", role: "user" }, { id: "2", email: "b@b.com", name: "B", role: "admin" }], total: 2 });

    const res = await request(app).get("/auth/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it("passes search, limit, offset query params", async () => {
    mockListUsers.mockResolvedValue({ users: [], total: 0 });

    await request(app).get("/auth/admin/users?search=test&limit=10&offset=5");
    expect(mockListUsers).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ searchValue: "test", limit: 10, offset: 5 }) }));
  });

  it("returns 500 on API error", async () => {
    mockListUsers.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/auth/admin/users");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /auth/admin/users/:id", () => {
  it("returns user by ID", async () => {
    mockGetUser.mockResolvedValue({ user: { id: "user-1", email: "test@test.com", name: "Test", role: "user" } });

    const res = await request(app).get("/auth/admin/users/user-1");
    expect(res.status).toBe(200);
    expect(res.body.user.user.id).toBe("user-1");
  });

  it("returns 500 on error", async () => {
    mockGetUser.mockRejectedValue(new Error("Not found"));

    const res = await request(app).get("/auth/admin/users/nonexistent");
    expect(res.status).toBe(500);
  });
});

describe("POST /auth/admin/users", () => {
  it("creates a user with valid data", async () => {
    mockCreateUser.mockResolvedValue({ user: { id: "new-1", email: "new@test.com", name: "New", role: "user" } });

    const res = await request(app).post("/auth/admin/users").send({ email: "new@test.com", password: "Pass12345", name: "New" });
    expect(res.status).toBe(201);
    expect(mockCreateUser).toHaveBeenCalled();
  });

  it("rejects missing email", async () => {
    const res = await request(app).post("/auth/admin/users").send({ password: "Pass12345", name: "Test" });
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await request(app).post("/auth/admin/users").send({ email: "test@test.com", password: "123", name: "Test" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const res = await request(app).post("/auth/admin/users").send({ email: "not-email", password: "Pass12345", name: "Test" });
    expect(res.status).toBe(400);
  });

  it("rejects empty name", async () => {
    const res = await request(app).post("/auth/admin/users").send({ email: "test@test.com", password: "Pass12345", name: "" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /auth/admin/users/:id", () => {
  it("updates user email", async () => {
    mockUpdateUser.mockResolvedValue({ user: { id: "user-1", email: "updated@test.com", name: "Test" } });

    const res = await request(app).put("/auth/admin/users/user-1").send({ email: "updated@test.com" });
    expect(res.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalled();
  });

  it("updates user name with correct body structure", async () => {
    mockUpdateUser.mockResolvedValue({ user: { id: "user-1", email: "test@test.com", name: "Updated" } });

    await request(app).put("/auth/admin/users/user-1").send({ name: "Updated" });
    expect(mockUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ data: { name: "Updated" } }) }));
  });

  it("rejects invalid email", async () => {
    const res = await request(app).put("/auth/admin/users/user-1").send({ email: "bad" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /auth/admin/users/:id", () => {
  it("removes a user", async () => {
    mockRemoveUser.mockResolvedValue({ success: true });

    const res = await request(app).delete("/auth/admin/users/user-1");
    expect(res.status).toBe(200);
    expect(mockRemoveUser).toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockRemoveUser.mockRejectedValue(new Error("Delete failed"));

    const res = await request(app).delete("/auth/admin/users/nonexistent");
    expect(res.status).toBe(500);
  });
});

describe("GET /auth/admin/users/:id/sessions", () => {
  it("lists user sessions", async () => {
    mockListUserSessions.mockResolvedValue({ sessions: [{ id: "sess-1", token: "tok-1", userId: "user-1" }] });

    const res = await request(app).get("/auth/admin/users/user-1/sessions");
    expect(res.status).toBe(200);
    expect(res.body.sessions.sessions).toHaveLength(1);
  });
});

describe("POST /auth/admin/set-role", () => {
  it("sets role for a user", async () => {
    mockSetRole.mockResolvedValue({ user: { id: "user-1", role: "cashier" } });

    const res = await request(app).post("/auth/admin/set-role").send({ userId: "user-1", role: "cashier" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects unknown role", async () => {
    const res = await request(app).post("/auth/admin/set-role").send({ userId: "user-1", role: "superadmin" });
    expect(res.status).toBe(400);
  });

  it("rejects missing userId", async () => {
    const res = await request(app).post("/auth/admin/set-role").send({ role: "admin" });
    expect(res.status).toBe(400);
  });

  it("rejects missing role", async () => {
    const res = await request(app).post("/auth/admin/set-role").send({ userId: "user-1" });
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/admin/audit-logs", () => {
  it("returns paginated audit logs", async () => {
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    (requireAdmin as any).mockImplementation((_: any, __: any, next: any) => next());

    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: "1", action: "createUser", actor_id: "admin-1", created_at: "2025-01-01T00:00:00Z" }],
    });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: "1" }] });

    const res = await request(app).get("/auth/admin/audit-logs");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("filters by action", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: "0" }] });

    const res = await request(app).get("/auth/admin/audit-logs?action=createUser");
    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenCalled();
  });
});
