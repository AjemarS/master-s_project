"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;

export const useCurrentUser = () => {
  const { data, isPending } = useSession();
  return {
    isPending,
    session: data?.session,
    user: data?.user,
  };
};

export const useCurrentUserOrRedirect = (
  forbiddenUrl = "/auth/sign-in",
  okUrl = "",
  ignoreForbidden = false
) => {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    // only perform redirects after loading is complete and router is ready
    if (!isPending && router) {
      // if no user is found
      if (!data?.user) {
        // redirect to forbidden url unless explicitly ignored
        if (!ignoreForbidden) {
          router.push(forbiddenUrl);
        }
        // if ignoreforbidden is true, we do nothing and let the hook return the null user
      } else if (okUrl) {
        // if user is found and an okurl is provided, redirect there
        router.push(okUrl);
      }
    }
    // depend on loading state, user data, router instance, and redirect urls
  }, [isPending, data?.user, router, forbiddenUrl, okUrl, ignoreForbidden]);

  return {
    isPending,
    session: data?.session,
    user: data?.user,
  };
};
