<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let {
    id,
    label,
    value = $bindable(1),
    helper,
    onValueChange
  }: {
    id: string;
    label: string;
    value: number;
    helper?: string;
    onValueChange?: (value: number) => void;
  } = $props();

  function handleInput(event: Event) {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    value = Number.isFinite(next) ? next : 1;
    onValueChange?.(value);
  }
</script>

<div class="space-y-2">
  <Label for={id}>{label}</Label>
  <Input
    {id}
    min={1}
    step={1}
    type="number"
    value={Number.isFinite(value) ? value : 1}
    oninput={handleInput}
  />
  {#if helper}
    <p class="text-xs leading-5 text-muted-foreground">{helper}</p>
  {/if}
</div>
