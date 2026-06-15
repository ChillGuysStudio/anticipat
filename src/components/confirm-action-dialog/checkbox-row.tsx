import { cn } from "@/lib/utils";

export function CheckboxRow({
  id,
  label,
  checked,
  onChange,
  className
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}
