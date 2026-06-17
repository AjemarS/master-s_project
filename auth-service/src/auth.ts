import { betterAuth } from "better-auth";
import { admin, twoFactor } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // Базові налаштування
  // In production, BETTER_AUTH_SECRET must be set in the environment
  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/auth",

  trustedOrigins: ["http://localhost", "http://localhost:3000", "http://localhost:3001"],
  appName: "Store",
  plugins: [
    // ADMIN_USER_IDS should be set in .env for admin users to use the admin dashboard
    admin({
      adminUserIds: (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean),
    }),
    twoFactor(),
  ],

  // Email + Password автентифікація
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Можна ввімкнути пізніше
    minPasswordLength: 8,
  },

  // Налаштування сесій
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 днів
    updateAge: 60 * 60 * 24, // Оновлювати кожен день
  },

  // Налаштування cookies
  advanced: {
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: true,
    },
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: process.env.GOOGLE_REDIRECT_URL || "http://localhost:3001/auth/callback/google",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      redirectURI: process.env.GITHUB_REDIRECT_URL || "http://localhost:3001/auth/callback/github",
    },
  },

  // Переадресації після входу
  redirects: {
    afterSignIn: "http://localhost/",
    afterSignUp: "http://localhost/sign-in",
    afterSignOut: "http://localhost/",
  },

  // Додаткові поля користувача
  user: {
    additionalFields: {
      status: {
        type: "string",
        defaultValue: "active",
        input: false,
        required: false,
      },
    },
  },

  // Налаштування security
  rateLimit: {
    enabled: true,
    window: 60, // 60 секунд
    max: 100, // 100 запитів
  },
});
