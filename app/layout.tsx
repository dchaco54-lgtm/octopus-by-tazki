import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Octopus by Tazki",
  description: "Internal Ops Platform for Tazki",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
