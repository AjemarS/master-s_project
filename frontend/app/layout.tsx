import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./lib/css/globals.css";

import { CartProvider } from "~/lib/hooks/use-cart";
import { BreadcrumbProvider } from "~/ui/components/breadcrumbs/breadcrumbs-context";
import { ThemeProvider } from "~/ui/components/theme-provider";
import { Toaster } from "~/ui/primitives/sonner";

const geistSans = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "TechHub — online store of home appliances",
  title: "TechHub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
