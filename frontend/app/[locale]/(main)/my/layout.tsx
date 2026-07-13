import { UserSidebar } from "~/ui/components/user-sidebar";
import { ErrorBoundary } from "~/ui/components/error-boundary";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-full">
      <UserSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
