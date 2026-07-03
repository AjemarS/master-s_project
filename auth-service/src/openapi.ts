import { Router } from "express";
import swaggerUi from "swagger-ui-express";

const spec: Record<string, unknown> = {
  openapi: "3.0.3",
  info: {
    title: "TechHub Auth Service",
    version: "1.0.0",
    description: [
      "Authentication and authorization for TechHub e-commerce platform.",
      "Roles: `admin`, `user`, `cashier`, `warehouse_worker`.",
      "Admin endpoints require `admin` role + valid session cookie (`better-auth.session_token`).",
    ].join("\n\n"),
  },
  servers: [
    { url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth` : "http://localhost/auth", description: "Via Nginx gateway" },
    { url: process.env.FRONTEND_URL || "http://localhost:3001", description: "Direct (dev only)" },
  ],
  components: {
    schemas: {
      Error: { type: "object", properties: { success: { type: "boolean", enum: [false] }, message: { type: "string" }, errors: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } } } },
      Success: { type: "object", properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } } },
      Session: { type: "object", properties: { id: { type: "string" }, token: { type: "string" }, userId: { type: "string" }, expiresAt: { type: "string" } } },
      User: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["admin", "user", "cashier", "warehouse_worker"] }, status: { type: "string" } } },
    },
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "better-auth.session_token", description: "Session cookie set after sign-in" },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    "/health": {
      get: { summary: "Deep health check", tags: ["Infrastructure"], responses: { "200": { description: "Healthy", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["healthy"] }, service: { type: "string" }, checks: { type: "object" }, uptime: { type: "number" } } } } } }, "503": { description: "Degraded" } } },
    },
    "/auth/sign-in/email": {
      post: { summary: "Sign in with email/password", tags: ["Authentication"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" }, password: { type: "string" } }, required: ["email", "password"] } } } }, responses: { "200": { description: "Authenticated" }, "429": { description: "Rate limited" } } },
    },
    "/auth/two-factor/enable": {
      post: { summary: "Enable 2FA (TOTP)", tags: ["2FA"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { password: { type: "string" }, issuer: { type: "string" } }, required: ["password"] } } } }, responses: { "200": { description: "2FA enabled" }, "400": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/two-factor/disable": {
      post: { summary: "Disable 2FA", tags: ["2FA"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { password: { type: "string" } }, required: ["password"] } } } }, responses: { "200": { description: "2FA disabled" }, "400": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/me": {
      get: { summary: "Get current session and user", tags: ["Session"], description: "Used by Nginx gateway auth_request. Sets X-User-* response headers.", responses: { "200": { description: "Session data or null" } } },
    },
    "/auth/sessions": {
      get: { summary: "List own active sessions", tags: ["Session"], security: [{ sessionCookie: [] }], responses: { "200": { description: "List of sessions" }, "401": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/sessions/revoke": {
      post: { summary: "Revoke own session", tags: ["Session"], security: [{ sessionCookie: [] }], responses: { "200": { description: "Session revoked" }, "401": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/admin/sessions/revoke": {
      post: { summary: "Admin: revoke any session", tags: ["Admin"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { sessionToken: { type: "string" }, userId: { type: "string" } } } } } }, responses: { "200": { $ref: "#/components/schemas/Success" } } },
    },
    "/auth/admin/users": {
      get: { summary: "List users", tags: ["Admin"], security: [{ sessionCookie: [] }], parameters: [{ name: "search", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "offset", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Paginated user list" } } },
      post: { summary: "Create user", tags: ["Admin"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, description: "Must contain uppercase, lowercase, digit" }, name: { type: "string" } }, required: ["email", "password", "name"] } } } }, responses: { "201": { description: "User created" }, "400": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/admin/users/{id}": {
      get: { summary: "Get user by ID", tags: ["Admin"], security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "User data" } } },
      put: { summary: "Update user", tags: ["Admin"], security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" }, name: { type: "string" }, status: { type: "string" } } } } } }, responses: { "200": { description: "User updated" }, "400": { $ref: "#/components/schemas/Error" } } },
      delete: { summary: "Delete user", tags: ["Admin"], security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "User deleted" } } },
    },
    "/auth/admin/users/{id}/sessions": {
      get: { summary: "List user sessions", tags: ["Admin"], security: [{ sessionCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Sessions list" } } },
    },
    "/auth/admin/set-role": {
      post: { summary: "Set user role", tags: ["Admin"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { userId: { type: "string" }, role: { type: "string", enum: ["admin", "user", "cashier", "warehouse_worker"] } }, required: ["userId", "role"] } } } }, responses: { "200": { description: "Role updated" }, "400": { $ref: "#/components/schemas/Error" } } },
    },
    "/auth/admin/impersonate": {
      post: { summary: "Admin: impersonate user", tags: ["Impersonation"], security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] } } } }, responses: { "200": { description: "Impersonation started" } } },
    },
    "/auth/admin/stop-impersonation": {
      post: { summary: "Stop impersonation", tags: ["Impersonation"], responses: { "200": { $ref: "#/components/schemas/Success" } } },
    },
    "/auth/impersonate/request-code": {
      post: { summary: "Request impersonation code (cashier)", tags: ["Impersonation"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { userEmail: { type: "string", format: "email" } }, required: ["userEmail"] } } } }, responses: { "200": { description: "Code sent to email" } } },
    },
    "/auth/impersonate/verify-code": {
      post: { summary: "Verify code and start impersonation", tags: ["Impersonation"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { userEmail: { type: "string", format: "email" }, code: { type: "string" } }, required: ["userEmail", "code"] } } } }, responses: { "200": { description: "Impersonation started" } } },
    },
  },
};

export const openApiRouter = Router();
openApiRouter.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
openApiRouter.get("/api-docs.json", (_req, res) => res.json(spec));
