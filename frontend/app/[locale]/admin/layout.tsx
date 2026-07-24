import { AdminSidebar } from "./components/admin-sidebar";
import { ImpersonationBadge } from "./components/impersonation-badge";
import { ErrorBoundary } from "~/ui/components/error-boundary";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ImpersonationBadge />
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-muted/50">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}