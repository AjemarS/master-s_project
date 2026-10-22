import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";

import "./lib/css/globals.css";

import { CartProvider } from "~/lib/hooks/use-cart";
import { BreadcrumbProvider } from "~/ui/components/breadcrumbs/breadcrumbs-context";
import { ThemeProvider } from "~/ui/components/theme-provider";
import { Toaster } from "~/ui/primitives/sonner";
import { MotionProvider } from "~/ui/components/motion/motion-provider";
import { getLocale } from "next-intl/server";

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
  // The URL segment is "ua", but the language tag for Ukrainian is "uk"
  const locale = await getLocale();
  return (
    <html lang={locale === "en" ? "en" : "uk"} suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          font-sans min-h-dvh antialiased
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
          <MotionProvider>
            <CartProvider>
              <BreadcrumbProvider>
                {children}
              </BreadcrumbProvider>
              <Toaster />
            </CartProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
