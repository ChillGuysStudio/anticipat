import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MonthInput({
  id,
  label,
  value,
  onChange,
  helper
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        min={1}
        step={1}
        type="number"
        value={Number.isFinite(value) ? value : 1}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
