"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "~/lib/auth-client";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { AdminSidebar } from "./components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !user) {
      router.push("/sign-in?redirect=/admin");
    } else if (!isPending && user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-600 dark:text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Alert className="max-w-md border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            You must be logged in to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <Alert className="max-w-md border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            You don&apos;t have permission to access the admin panel. Admin role required.
            Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        {children}
      </main>
    </div>
  );
}
