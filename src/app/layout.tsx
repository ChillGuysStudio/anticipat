import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "./globals.css";
import "@clerk/ui/themes/shadcn.css";

export const metadata: Metadata = {
  title: "Anticipat",
  description: "Prima Casă Plus repayment planner — plan your early repayment"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: shadcn,
        variables: {
          colorBackground: "hsl(var(--card))",
          colorDanger: "hsl(var(--destructive))",
          colorForeground: "hsl(var(--card-foreground))",
          colorInput: "hsl(var(--input))",
          colorInputForeground: "hsl(var(--card-foreground))",
          colorMuted: "hsl(var(--muted))",
          colorMutedForeground: "hsl(var(--muted-foreground))",
          colorNeutral: "hsl(var(--foreground))",
          colorPrimary: "hsl(var(--primary))",
          colorPrimaryForeground: "hsl(var(--primary-foreground))",
        }
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
