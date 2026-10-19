import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const query = vi.fn();
const migrateAuthSchema = vi.fn();
const getMigrations = vi.fn(async () => ({ runMigrations: migrateAuthSchema }));
const authOptions = { marker: "auth options" };

vi.mock("../auth", () => ({ pool: { query }, auth: { options: authOptions } }));
vi.mock("better-auth/db/migration", () => ({ getMigrations }));
vi.mock("better-auth/crypto", () => ({ hashPassword: vi.fn(async () => "hash") }));

const envBackup = { NODE_ENV: process.env.NODE_ENV, SEED_DEMO_USERS: process.env.SEED_DEMO_USERS };

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [] });
  migrateAuthSchema.mockReset().mockResolvedValue(undefined);
  getMigrations.mockClear();
});

afterEach(() => {
  for (const [k, v] of Object.entries(envBackup)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("runMigrations", () => {
  it("creates the Better Auth schema before the service's own tables", async () => {
    const { runMigrations } = await import("../db/migrations.js");
    await runMigrations();
    expect(getMigrations).toHaveBeenCalledWith(authOptions);
    expect(migrateAuthSchema).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS audit_log"));
    expect(migrateAuthSchema.mock.invocationCallOrder[0]).toBeLessThan(query.mock.invocationCallOrder[0]);
  });
});

describe("seedNonAdminUsers", () => {
  it("never seeds known-password demo staff in production by default", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SEED_DEMO_USERS;
    const { seedNonAdminUsers } = await import("../db/seeds.js");
    await seedNonAdminUsers();
    expect(query).not.toHaveBeenCalled();
  });

  it("seeds them in production when SEED_DEMO_USERS=true (staging)", async () => {
    process.env.NODE_ENV = "production";
    process.env.SEED_DEMO_USERS = "true";
    const { seedNonAdminUsers } = await import("../db/seeds.js");
    await seedNonAdminUsers();
    expect(query).toHaveBeenCalledWith('SELECT id FROM "user" WHERE email = $1', ["cashier@techhub.local"]);
  });

  it("seeds them outside production", async () => {
    process.env.NODE_ENV = "development";
    const { seedNonAdminUsers } = await import("../db/seeds.js");
    await seedNonAdminUsers();
    expect(query).toHaveBeenCalled();
  });
});
