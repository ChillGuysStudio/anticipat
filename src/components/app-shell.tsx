import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto min-h-screen w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-10", className)}>
      {children}
    </main>
  );
}
