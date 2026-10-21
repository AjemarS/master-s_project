import { Breadcrumbs } from "~/ui/components/breadcrumbs";
import { Footer } from "~/ui/components/footer";
import { Header } from "~/ui/components/header/header";
import { SkipLink } from "~/ui/components/skip-link";
import { CompareBar } from "~/ui/components/compare-bar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SkipLink />
      <Header showAuth={true} />
      <main id="main-content" tabIndex={-1} className="flex min-h-dvh flex-col outline-none">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
        </div>
        {children}
      </main>
      <Footer />
      <CompareBar />
    </>
  );
}
