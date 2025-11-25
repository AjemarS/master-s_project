import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // Базові налаштування
  secret: process.env.BETTER_AUTH_SECRET || "your-super-secret-key-min-32-characters-long",

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/auth",

  trustedOrigins: ["http://localhost", "http://localhost:3000", "http://localhost:3001"],

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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 днів
    },
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
      redirectURI: `${process.env.BETTER_AUTH_URL || "http://localhost:3001/auth"}/callback/google`,
    },
  },
  
  // Переадресації після входу
  redirects:{
    afterSignIn: "http://localhost/",
  },

  // Додаткові поля користувача
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
      emailVerified: {
        type: "boolean",
        defaultValue: false,
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

  // Callbacks
  callbacks: {
    async onSignIn(user) {
      console.log(`✅ User signed in: ${user.email}`);
    },
    async onSignUp(user) {
      console.log(`🎉 New user registered: ${user.email}`);
    },
  },
});
