import { AdminSidebar } from "./components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        {children}
      </main>
    </div>
  );
}