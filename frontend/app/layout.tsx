import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Каталог продуктів",
  description: "Мікросервісний додаток для управління продуктами",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
