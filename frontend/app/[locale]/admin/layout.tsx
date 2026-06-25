import { AdminSidebar } from "./components/admin-sidebar";
import { ImpersonationBadge } from "./components/impersonation-badge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ImpersonationBadge />
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        {children}
      </main>
    </div>
  );
}