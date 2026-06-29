import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();

vi.mock("../auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("../logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockReq(headers: Record<string, string> = {}): any {
  return { headers };
}

function mockRes(): any {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.locals = {};
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("requireAuth", () => {
  it("calls next when session exists", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", role: "user", email: "a@b.com" },
      session: { id: "s1" },
    });
    const { requireAuth } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.user).toEqual({ id: "u1", role: "user", email: "a@b.com" });
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { requireAuth } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockGetSession.mockRejectedValue(new Error("DB down"));
    const { requireAuth } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("calls next when session has admin role", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", role: "admin", email: "admin@b.com" },
      session: { id: "s1" },
    });
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.user).toEqual({ id: "u1", role: "admin", email: "admin@b.com" });
  });

  it("returns 403 when session has user role", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", role: "user", email: "user@b.com" },
      session: { id: "s1" },
    });
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockGetSession.mockRejectedValue(new Error("DB down"));
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows cashier role even though requireAdmin blocks it (correctly)", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", role: "cashier", email: "cashier@b.com" },
      session: { id: "s1" },
    });
    const { requireAdmin } = await import("../middleware/authMiddleware.js");
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
