"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "~/lib/auth-client";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You must be logged in to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <Alert className="max-w-md border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You don&apos;t have permission to access the admin panel. Admin role required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
