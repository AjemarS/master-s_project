import { Breadcrumbs } from "~/ui/components/breadcrumbs";
import { Footer } from "~/ui/components/footer";
import { Header } from "~/ui/components/header/header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header showAuth={true} />
      <main className="flex min-h-screen flex-col">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
        </div>
        {children}
      </main>
      <Footer />
    </>
  );
}
