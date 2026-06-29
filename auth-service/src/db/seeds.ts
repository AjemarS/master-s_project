import crypto from "crypto";
import { pool } from "../auth";
import { hashPassword } from "better-auth/crypto";
import logger from "../logger";

export async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) return;

  try {
    const existingAdmin = await pool.query(
      'SELECT 1 FROM "user" WHERE role = $1 LIMIT 1',
      ["admin"]
    );
    if (existingAdmin.rows.length > 0) {
      logger.debug("Admin user exists in DB, skipping seed");
      return;
    }

    const result = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [adminEmail]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      await pool.query(
        'UPDATE "user" SET "emailVerified" = true, role = $1 WHERE id = $2',
        ["admin", userId]
      );
      logger.info("Existing user promoted to admin", { userId, email: adminEmail, emailVerified: true });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(adminPassword);

    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [userId, adminName, adminEmail, true, "admin", "active"]
    );

    await pool.query(
      `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [crypto.randomUUID(), userId, "credential", userId, passwordHash]
    );

    logger.info("Admin user created", { userId, email: adminEmail, name: adminName });
  } catch (error: unknown) {
    logger.warn("Failed to seed admin user", { error: (error as Error).message });
  }
}

export async function seedNonAdminUsers() {
  const seedUsers = [
    { name: "Cashier", email: "cashier@techhub.local", role: "cashier" },
    { name: "Warehouse Worker", email: "warehouse@techhub.local", role: "warehouse_worker" },
    { name: "Customer", email: "customer@techhub.local", role: "user" },
  ];

  for (const user of seedUsers) {
    try {
      const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [user.email]);
      if (existing.rows.length > 0) continue;

      const userId = crypto.randomUUID();
      const passwordHash = await hashPassword("password123");

      await pool.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", role, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [userId, user.name, user.email, true, user.role, "active"]
      );

      await pool.query(
        `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [crypto.randomUUID(), userId, "credential", userId, passwordHash]
      );

      logger.info("Seed user created", { userId, email: user.email, role: user.role });
    } catch (error: unknown) {
      logger.warn("Failed to seed user", { email: user.email, error: (error as Error).message });
    }
  }
}
