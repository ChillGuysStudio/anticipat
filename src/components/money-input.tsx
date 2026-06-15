import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  helper,
  min = 0
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  helper?: string;
  min?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          min={min}
          step="1"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          onBlur={onBlur}
          className="pr-14"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          MDL
        </span>
      </div>
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
