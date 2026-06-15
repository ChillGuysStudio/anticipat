import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PercentInput({
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
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          min={0}
          max={100}
          step="0.01"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="pr-10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
