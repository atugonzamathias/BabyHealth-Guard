import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BabyHealth Guard | Health Worker Dashboard",
  description: "Maternal and newborn care dashboard for health workers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
