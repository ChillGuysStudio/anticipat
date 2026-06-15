import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const value = React.useContext(TabsContext);
  if (!value) {
    throw new Error("Tabs components must be used inside Tabs.");
  }
  return value;
}

function Tabs({
  value,
  onValueChange,
  children,
  className
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap gap-1 border-b", className)}
      role="tablist"
      aria-orientation="horizontal"
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const tabs = useTabs();
  const selected = tabs.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={cn(
        "min-h-10 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        selected && "border-primary text-foreground",
        className
      )}
      onClick={() => tabs.onValueChange(value)}
      {...props}
    />
  );
}

function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const tabs = useTabs();

  if (tabs.value !== value) {
    return null;
  }

  return <div className={cn("pt-6", className)} role="tabpanel" {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
