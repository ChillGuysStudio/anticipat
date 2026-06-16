<script lang="ts">
  import * as Card from '$lib/components/ui/card/index.js';
  import { cn } from '$lib/utils';

  let {
    label,
    value,
    helper,
    class: className
  }: {
    label: string;
    value: string;
    helper?: string;
    class?: string;
  } = $props();
</script>

<Card.Root class={cn('shadow-none', className)}>
  <Card.Content class="space-y-2 p-4">
    <div class="text-sm text-muted-foreground">{label}</div>
    <div class="text-2xl font-semibold tracking-tight">{value}</div>
    {#if helper}
      <div class="text-xs leading-5 text-muted-foreground">{helper}</div>
    {/if}
  </Card.Content>
</Card.Root>
