import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";

import "./lib/css/globals.css";

import { CartProvider } from "~/lib/hooks/use-cart";
import { BreadcrumbProvider } from "~/ui/components/breadcrumbs/breadcrumbs-context";
import { ThemeProvider } from "~/ui/components/theme-provider";
import { Toaster } from "~/ui/primitives/sonner";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "TechHub — online store of home appliances",
  title: "TechHub",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce from proxy.ts; reading headers also makes pages dynamic, which nonces require
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          min-h-screen antialiased
          selection:bg-primary/80
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          nonce={nonce}
        >
          <CartProvider>
            <BreadcrumbProvider>
              {children}
            </BreadcrumbProvider>
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
