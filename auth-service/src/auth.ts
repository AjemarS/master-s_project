import { betterAuth } from "better-auth";
import { admin, twoFactor } from "better-auth/plugins";
import { Pool } from "pg";
import { sendResetPasswordEmail, sendVerificationEmail } from "./email/sender";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/auth",

  trustedOrigins: ["http://localhost", "http://localhost:3000", "http://localhost:3001"],
  appName: "TechHub",
  plugins: [
    admin({
      adminUserIds: (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean),
    }),
    twoFactor(),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: true,
    },
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "x-client-ip"],
    },
  },

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

  redirects: {
    afterSignIn: "http://localhost/",
    afterSignUp: "http://localhost/sign-in",
    afterSignOut: "http://localhost/",
  },

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

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
});
