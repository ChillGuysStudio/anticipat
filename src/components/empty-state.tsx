import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-2 p-6 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
