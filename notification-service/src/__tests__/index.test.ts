import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getNotifPool: () => ({ query: vi.fn(() => ({ rows: [] })), end: vi.fn() }),
  closeAll: vi.fn(),
}));

vi.mock("../notifications", () => ({
  createNotification: vi.fn(() => ({ id: "mock-notif-1" })),
  listNotifications: vi.fn(() => ({ items: [], total: 0 })),
  getUnreadCount: vi.fn(() => 0),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
  clearAll: vi.fn(),
  cleanOldDismissed: vi.fn(),
  startCleanup: vi.fn(),
  stopCleanup: vi.fn(),
}));

vi.mock("../preferences", () => ({
  getPreferences: vi.fn(() => ({
    user_id: "user-1",
    order_confirmed_email: true, order_confirmed_in_app: true,
    order_shipped_email: true, order_shipped_in_app: true,
    order_delivered_email: true, order_delivered_in_app: true,
    order_cancelled_email: true, order_cancelled_in_app: true,
    marketing_email: true, marketing_in_app: true,
    low_stock_email: true, low_stock_in_app: true,
  })),
  setPreferences: vi.fn(),
  ensureDefaults: vi.fn(),
  getMarketingTargets: vi.fn(() => []),
}));

vi.mock("../events", () => ({
  markProcessed: vi.fn(() => Promise.resolve(true)),
  startCleanup: vi.fn(),
  stopCleanup: vi.fn(),
  cleanupOldEvents: vi.fn(),
}));

vi.mock("../admin", () => ({
  getAdminUsers: vi.fn(() => Promise.resolve([])),
  getUserById: vi.fn((id: string) => Promise.resolve({ id, name: "Test", email: "user@test.com" })),
  getUserByEmail: vi.fn((email: string) => Promise.resolve({ id: "user-1", name: "Test", email })),
}));

vi.mock("../sse", () => ({
  addClient: vi.fn(),
  broadcast: vi.fn(),
  broadcastToAll: vi.fn(),
  getClientCount: vi.fn(() => 0),
  clearClients: vi.fn(),
  initRedis: vi.fn(),
  closeRedis: vi.fn(),
}));

vi.mock("../rate-limiter", () => ({
  rateLimit: () => (_req: any, _res: any, next: () => void) => next(),
  startCleanup: vi.fn(),
  stopCleanup: vi.fn(),
}));

describe("notification-service", () => {
  let mod: typeof import("../index");

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_EMAIL = "";
    vi.resetModules();
    mod = await import("../index");
  });

  describe("htmlWrap", () => {
    it("should wrap body in HTML template", () => {
      const html = mod.htmlWrap("<p>Test</p>", "Test Title");
      expect(html).toContain("TechHub");
      expect(html).toContain("<p>Test</p>");
      expect(html).toContain("Test Title");
    });
  });

  describe("TEMPLATES", () => {
    it("should generate order.created template", () => {
      const data = { order_number: "ORD-123", total_amount: "999.99" };
      const { subject, html } = mod.TEMPLATES["order.created"](data);
      expect(subject).toContain("ORD-123");
      expect(html).toContain("999.99");
    });

    it("should generate order.status_changed shipped template", () => {
      const data = { order_number: "ORD-123", status: "shipped" };
      const { subject, html } = mod.TEMPLATES["order.status_changed"](data);
      expect(subject).toContain("відправлено");
      expect(html).toContain("в дорозі");
    });

    it("should generate order.status_changed delivered template", () => {
      const data = { order_number: "ORD-123", status: "delivered" };
      const { subject, html } = mod.TEMPLATES["order.status_changed"](data);
      expect(html).toContain("доставлено");
    });

    it("should generate order.cancelled template", () => {
      const data = { order_number: "ORD-123" };
      const { subject, html } = mod.TEMPLATES["order.cancelled"](data);
      expect(subject).toContain("скасовано");
    });

    it("should generate inventory.low_stock template", () => {
      const data = { product_id: 42, quantity: 3, warehouse_name: "Main" };
      const { subject, html } = mod.TEMPLATES["inventory.low_stock"](data);
      expect(subject).toContain("42");
      expect(html).toContain("3");
      expect(html).toContain("Main");
    });
  });

  describe("handleEvent", () => {
    it("should log dry-run for order.created", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("order.created", {
        order_number: "ORD-123",
        total_amount: "500",
        customer_email: "user@test.com",
      } as any, "evt-1");
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("[dry-run] Email to user@test.com: Замовлення #ORD-123"),
      );
      log.mockRestore();
    });

    it("should log dry-run for inventory.low_stock", async () => {
      process.env.ADMIN_EMAIL = "admin@techhub.shop";
      vi.resetModules();
      const m = await import("../index");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await m.handleEvent("inventory.low_stock", {
        product_id: 42, quantity: 2, warehouse_name: "Main",
      } as any, "evt-2");
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("[dry-run] Email to admin@techhub.shop: Низький залишок"),
      );
      log.mockRestore();
    });

    it("should skip duplicate events via in-memory set", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const event = { order_number: "ORD-123", total_amount: "500", customer_email: "u@t.com" };
      await mod.handleEvent("order.created", event as any, "dup-1");
      log.mockClear();
      await mod.handleEvent("order.created", event as any, "dup-1");
      expect(log).toHaveBeenCalledWith("[dedup] Skipping dup-1 (in-memory)");
      log.mockRestore();
    });

    it("should skip unknown routing keys", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("unknown.key", {} as any, "evt-3");
      expect(log).toHaveBeenCalledWith("[unknown] No template for unknown.key");
      log.mockRestore();
    });

    it("should skip events with no recipient", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("order.created", { order_number: "ORD-123", total_amount: "500" } as any, "evt-4");
      expect(log).toHaveBeenCalledWith(expect.stringContaining("No recipient"));
      log.mockRestore();
    });

    it("should warn when ADMIN_EMAIL is empty for low_stock", async () => {
      process.env.ADMIN_EMAIL = "";
      vi.resetModules();
      const m = await import("../index");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      await m.handleEvent("inventory.low_stock", { product_id: 42, quantity: 2 } as any, "evt-5");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("ADMIN_EMAIL not configured"));
      warn.mockRestore();
    });

    it("should skip events already in DB dedup table", async () => {
      const eventsMock = await import("../events");
      vi.mocked(eventsMock.markProcessed).mockResolvedValue(false);

      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("order.created", {
        order_number: "ORD-DUP",
        total_amount: "100",
        customer_email: "dup@test.com",
      } as any, "dup-db-1");
      expect(log).toHaveBeenCalledWith("[dedup] Skipping dup-db-1 (db)");
      log.mockRestore();
    });
  });
});
