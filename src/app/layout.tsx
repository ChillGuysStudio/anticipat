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
        },
        elements: {
          modalBackdrop: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
          modalContainer: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            overflow: "hidden",
          },
          modalContent: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }
        }
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
