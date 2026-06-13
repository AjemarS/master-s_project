"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001/auth",
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
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // only perform redirects after loading is complete and router is ready
    if (!isPending && routerRef.current) {
      // if no user is found
      if (!data?.user) {
        // redirect to forbidden url unless explicitly ignored
        if (!ignoreForbidden) {
          routerRef.current.push(forbiddenUrl);
        }
        // if ignoreforbidden is true, we do nothing and let the hook return the null user
      } else if (okUrl) {
        // if user is found and an okurl is provided, redirect there
        routerRef.current.push(okUrl);
      }
    }
    // depend only on the values that matter, not router reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, data?.user, forbiddenUrl, okUrl, ignoreForbidden]);

  return {
    isPending,
    session: data?.session,
    user: data?.user,
  };
};
