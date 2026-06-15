import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  className
}: {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className="space-y-2 p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {helper ? <div className="text-xs leading-5 text-muted-foreground">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}
