import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "../rate-limiter";
import * as sse from "../sse";

describe("rate-limiter", () => {
  it("should allow requests under the limit", () => {
    const handler = rateLimit({ max: 3, windowMs: 60000 });
    let called = 0;
    const req = { headers: { "x-gateway-user-id": "user-1" }, ip: "127.0.0.1" } as any;
    const res = { status: () => ({ json: () => {} }), json: () => {} } as any;
    const next = () => { called++; };

    handler(req, res, next);
    handler(req, res, next);
    handler(req, res, next);

    expect(called).toBe(3);
  });

  it("should block requests over the limit", () => {
    const handler = rateLimit({ max: 2, windowMs: 60000 });
    let statusCode = 0;
    let body: any = null;
    const req = { headers: { "x-gateway-user-id": "user-2" }, ip: "127.0.0.1" } as any;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return { json: (b: any) => { body = b; } };
      },
      json: () => {},
    } as any;

    handler(req, res, () => {});
    handler(req, res, () => {});
    handler(req, res, () => {});

    expect(statusCode).toBe(429);
    expect(body).toEqual({ error: "Too many requests" });
  });

  it("should track different users separately", () => {
    const handler = rateLimit({ max: 1, windowMs: 60000 });
    let user1Calls = 0;
    let user2Calls = 0;

    const req1 = { headers: { "x-gateway-user-id": "user-a" }, ip: "127.0.0.1" } as any;
    const req2 = { headers: { "x-gateway-user-id": "user-b" }, ip: "127.0.0.1" } as any;
    const res = { status: () => ({ json: () => {} }), json: () => {} } as any;

    handler(req1, res, () => { user1Calls++; });
    handler(req2, res, () => { user2Calls++; });

    expect(user1Calls).toBe(1);
    expect(user2Calls).toBe(1);
  });
});

describe("sse", () => {
  beforeEach(() => sse.clearClients());

  it("should add a client and track count", () => {
    const res = {
      on: (_evt: string, _cb: () => void) => {},
      write: () => true,
    } as any;
    sse.addClient("user-1", res);
    expect(sse.getClientCount()).toBe(1);
  });

  it("should remove client on close", () => {
    let closeCb: () => void = () => {};
    const res = {
      on: (evt: string, cb: () => void) => { if (evt === "close") closeCb = cb; },
      write: () => true,
    } as any;
    sse.addClient("user-2", res);
    expect(sse.getClientCount()).toBe(1);
    closeCb();
    expect(sse.getClientCount()).toBe(0);
  });

  it("should broadcast to correct user only", () => {
    const received: unknown[] = [];
    const res1 = {
      on: (_evt: string, _cb: () => void) => {},
      write: (data: unknown) => { received.push(data); return true; },
    } as any;
    const res2 = {
      on: (_evt: string, _cb: () => void) => {},
      write: () => true,
    } as any;

    sse.addClient("user-a", res1);
    sse.addClient("user-b", res2);
    received.length = 0;

    sse.broadcast("user-a", { message: "hello" });

    expect(received.length).toBe(1);
    expect(received[0]).toContain("hello");
  });
});
