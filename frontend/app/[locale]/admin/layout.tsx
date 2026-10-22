import { AdminSidebar } from "./components/admin-sidebar";
import { ImpersonationBadge } from "./components/impersonation-badge";
import { ErrorBoundary } from "~/ui/components/error-boundary";
import { AdminLayoutClient } from "./layout-client";
import { SkipLink } from "~/ui/components/skip-link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutClient>
      <SkipLink />
      <div className="flex min-h-dvh">
        <ImpersonationBadge />
        <AdminSidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-y-auto bg-muted/50 outline-none">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </AdminLayoutClient>
  );
}