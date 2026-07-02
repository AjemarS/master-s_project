import { describe, it, expect, vi } from "vitest";
import { requireOwnUserId, requireGatewayId } from "../routes";
import type { Request, Response } from "express";

function mockReq(headers: Record<string, string>, params: Record<string, string> = {}, query: Record<string, string> = {}): Partial<Request> {
  return { headers, params, query } as any;
}

function mockRes() {
  let statusCode = 0;
  let body: any = null;
  const res: Partial<Response> = {
    status: ((code: number) => { statusCode = code; return { json: (b: any) => { body = b; } } as any; }) as any,
    json: ((b: any) => { body = b; }) as any,
  };
  return { res };
}

describe("requireOwnUserId", () => {
  it("should reject if no userId param", () => {
    const { res } = mockRes();
    const req = mockReq({});
    const next = vi.fn();

    requireOwnUserId(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("should allow admin for any userId", () => {
    const { res } = mockRes();
    const req = mockReq({ "x-gateway-user-role": "admin" }, { userId: "other-user" });
    const next = vi.fn();

    requireOwnUserId(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("should allow matching userId", () => {
    const { res } = mockRes();
    const req = mockReq({ "x-gateway-user-id": "user-1" }, { userId: "user-1" });
    const next = vi.fn();

    requireOwnUserId(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("should reject non-matching userId", () => {
    const { res } = mockRes();
    const req = mockReq({ "x-gateway-user-id": "user-1" }, { userId: "user-2" });
    const next = vi.fn();

    requireOwnUserId(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireGatewayId", () => {
  it("should reject if header missing", () => {
    const { res } = mockRes();
    const req = mockReq({});
    const next = vi.fn();

    requireGatewayId(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("should allow if header present", () => {
    const { res } = mockRes();
    const req = mockReq({ "x-gateway-user-id": "user-1" });
    const next = vi.fn();

    requireGatewayId(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
