import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./lib/css/globals.css";

import { CartProvider } from "~/lib/hooks/use-cart";
import { ThemeProvider } from "~/ui/components/theme-provider";
import { Toaster } from "~/ui/primitives/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: `Good store`,
  title: `Store`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          min-h-screen bg-linear-to-br from-white to-slate-100
          text-neutral-900 antialiased
          selection:bg-primary/80
          dark:from-neutral-950 dark:to-neutral-900 dark:text-neutral-100
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
