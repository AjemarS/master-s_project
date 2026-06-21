"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost/auth",
  plugins: [
    inferAdditionalFields({
      user: {
        status: {
          type: "string",
          required: false,
          defaultValue: "active",
          input: false,
        },
      },
    }),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Redirect to 2FA page
        window.location.href = "/mfa";
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
