"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, twoFactorClient, emailOTPClient } from "better-auth/client/plugins";
import { useRouter } from "~/i18n/navigation";
import { useEffect } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth",
  plugins: [
    emailOTPClient(),
    inferAdditionalFields({
      user: {
        first_name: {
          type: "string",
          required: false,
        },
        last_name: {
          type: "string",
          required: false,
        },
        status: {
          type: "string",
          required: false,
          defaultValue: "active",
          input: false,
        },
        phone: {
          type: "string",
          required: false,
        },
        marketing_consent: {
          type: "boolean",
          required: false,
        },
        locale: {
          type: "string",
          required: false,
        },
      },
    }),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Extract current locale from URL pathname and preserve it
        const match = window.location.pathname.match(/^\/([a-z]{2})\//);
        const locale = match ? match[1] : "ua";
        window.location.href = `/${locale}/mfa`;
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export const twoFactor = authClient.twoFactor;

// Types
export type Session = typeof authClient.$Infer.Session.session;
export type User = typeof authClient.$Infer.Session.user;

export const useCurrentUser = () => {
  const { data, isPending } = useSession();
  return {
    isPending,
    session: data?.session,
    user: data?.user,
  };
};

export const useCurrentUserOrRedirect = (
  forbiddenUrl = "/sign-in",
  okUrl = "",
  ignoreForbidden = false
) => {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      if (!data?.user) {
        if (!ignoreForbidden) {
          router.push(forbiddenUrl);
        }
      } else if (okUrl) {
        router.push(okUrl);
      }
    }
  }, [isPending, data?.user, forbiddenUrl, okUrl, ignoreForbidden, router]);

  return {
    isPending,
    session: data?.session,
    user: data?.user,
  };
};
