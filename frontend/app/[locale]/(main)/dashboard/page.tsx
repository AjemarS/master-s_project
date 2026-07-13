"use client";

import { useEffect } from "react";
import { useRouter } from "~/i18n/navigation";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/my/overview"), 80);
    return () => clearTimeout(timer);
  }, [router]);
  return null;
}
