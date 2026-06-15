import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anticipat",
  description: "Local-first Prima Casă Plus repayment planner"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
