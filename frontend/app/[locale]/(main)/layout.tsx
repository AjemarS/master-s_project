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
      <main className="flex min-h-screen flex-col">{children}</main>
      <Footer />
    </>
  );
}
