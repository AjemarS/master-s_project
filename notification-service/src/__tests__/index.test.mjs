import { describe, it, expect, vi, beforeEach } from "vitest";

describe("notification-service", () => {
  let mod;

  beforeEach(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    mod = await import("../index.js");
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
      }, "evt-1");
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("[dry-run] Email to user@test.com: Замовлення #ORD-123"),
      );
      log.mockRestore();
    });

    it("should log dry-run for inventory.low_stock", async () => {
      process.env.ADMIN_EMAIL = "admin@techhub.shop";
      vi.resetModules();
      const m = await import("../index.js");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await m.handleEvent("inventory.low_stock", {
        product_id: 42, quantity: 2, warehouse_name: "Main",
      }, "evt-2");
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("[dry-run] Email to admin@techhub.shop: Низький залишок"),
      );
      log.mockRestore();
    });

    it("should skip duplicate events", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const event = { order_number: "ORD-123", total_amount: "500", customer_email: "u@t.com" };
      await mod.handleEvent("order.created", event, "dup-1");
      log.mockClear();
      await mod.handleEvent("order.created", event, "dup-1");
      expect(log).toHaveBeenCalledWith("[dedup] Skipping dup-1");
      log.mockRestore();
    });

    it("should skip unknown routing keys", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("unknown.key", {}, "evt-3");
      expect(log).toHaveBeenCalledWith("[unknown] No template for unknown.key");
      log.mockRestore();
    });

    it("should skip events with no recipient", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      await mod.handleEvent("order.created", { order_number: "ORD-123", total_amount: "500" }, "evt-4");
      expect(log).toHaveBeenCalledWith(expect.stringContaining("No recipient"));
      log.mockRestore();
    });

    it("should warn when ADMIN_EMAIL is empty for low_stock", async () => {
      vi.resetModules();
      process.env.NODE_ENV = "test";
      process.env.ADMIN_EMAIL = "";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const m = await import("../index.js");
      await m.handleEvent("inventory.low_stock", { product_id: 42, quantity: 2 }, "evt-5");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("ADMIN_EMAIL not configured"));
      warn.mockRestore();
    });
  });
});
