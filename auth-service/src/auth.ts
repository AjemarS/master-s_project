import { betterAuth } from "better-auth";
import { admin, anonymous, emailOTP, twoFactor } from "better-auth/plugins";
import { Pool } from "pg";
import { sendOtpEmail, sendResetPasswordEmail, sendVerificationEmail } from "./email/sender";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth` : "http://localhost/auth"),

  trustedOrigins: (() => {
    const fe = process.env.FRONTEND_URL;
    return fe ? [fe, fe.replace(/:\d+$/, "")] : ["http://localhost", "http://localhost:3000", "http://localhost:3001"];
  })(),
  appName: "TechHub",

  // Email verification enumeration protection
  // When admin plugin is active, the default synthetic user lacks admin fields
  // This makes a "user exists" response distinguishable from a "new sign-up" response
  customSyntheticUser: ({
    coreFields,
    additionalFields,
    id,
  }: {
    coreFields: { name: string; email: string; emailVerified: boolean; image: string | null; createdAt: Date; updatedAt: Date };
    additionalFields: Record<string, unknown>;
    id: string;
  }) => ({
    ...coreFields,
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
    ...additionalFields,
    id,
  }),

  plugins: [
    anonymous({
      emailDomainName: "techhub.guest",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const orderServiceUrl = process.env.ORDER_SERVICE_URL ?? "http://order-service:8002";
        try {
          const response = await fetch(`${orderServiceUrl}/api/orders/reassign/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Service-API-Key": process.env.SERVICE_API_KEY || "",
            },
            body: JSON.stringify({
              anonymous_user_id: anonymousUser.user.id,
              new_user_id: newUser.user.id,
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            console.error(`[anonymous] Order reassign failed: ${response.status} ${response.statusText}`);
            return;
          }
          const data = (await response.json()) as { reassigned: number };
          console.log(`[anonymous] Reassigned ${data.reassigned} orders: ${anonymousUser.user.id} → ${newUser.user.id}`);
        } catch (error) {
          console.error(`[anonymous] Order reassign error: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Don't await to prevent timing attacks
        void sendOtpEmail(email, otp, type);
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      resendStrategy: "reuse", // Reuse same OTP code on resend
    }),
    admin({
      adminUserIds: [],
    }),
    twoFactor(),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      // Do NOT await — prevents timing-based email enumeration
      void sendVerificationEmail(user.email, url);
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      // Do NOT await — prevents timing-based email enumeration
      void sendResetPasswordEmail(user.email, url);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
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
    afterSignIn: (process.env.FRONTEND_URL || "http://localhost") + "/",
    afterSignUp: (process.env.FRONTEND_URL || "http://localhost") + "/sign-in",
    afterSignOut: (process.env.FRONTEND_URL || "http://localhost") + "/",
  },

  user: {
    additionalFields: {
      first_name: { type: "string", input: true, required: false },
      last_name: { type: "string", input: true, required: false },
      status: { type: "string", defaultValue: "active", input: false, required: false },
      address_line1: { type: "string", input: true, required: false },
      address_line2: { type: "string", input: true, required: false },
      city: { type: "string", input: true, required: false },
      state: { type: "string", input: true, required: false },
      postal_code: { type: "string", input: true, required: false },
      country: { type: "string", input: true, required: false },
      phone: { type: "string", input: true, required: false },
      marketing_consent: { type: "boolean", input: true, required: false },
      locale: { type: "string", input: true, required: false },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
});
