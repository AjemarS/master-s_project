export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth is handled by middleware.ts (server-side)
  // No need for additional guards here since /dashboard/:path* is
  // protected by the middleware which checks the session cookie
  // against auth-service before any page renders.

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
