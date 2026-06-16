<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let {
    id,
    label,
    value = $bindable(0),
    helper,
    min = 0,
    onValueChange
  }: {
    id: string;
    label: string;
    value: number;
    helper?: string;
    min?: number;
    onValueChange?: (value: number) => void;
  } = $props();

  function handleInput(event: Event) {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    value = Number.isFinite(next) ? next : 0;
    onValueChange?.(value);
  }
</script>

<div class="space-y-2">
  <Label for={id}>{label}</Label>
  <div class="relative">
    <Input
      {id}
      inputmode="decimal"
      {min}
      step="1"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      oninput={handleInput}
      class="pr-14"
    />
    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      MDL
    </span>
  </div>
  {#if helper}
    <p class="text-xs leading-5 text-muted-foreground">{helper}</p>
  {/if}
</div>
