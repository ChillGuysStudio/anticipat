<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Card from '$lib/components/ui/card/index.js';

  let {
    title,
    description,
    children,
    actions
  }: {
    title: string;
    description?: string;
    children: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<Card.Root class="shadow-none">
  <Card.Header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="space-y-1.5">
      <Card.Title>{title}</Card.Title>
      {#if description}
        <Card.Description>{description}</Card.Description>
      {/if}
    </div>
    {#if actions}
      <div class="flex items-center gap-2">{@render actions()}</div>
    {/if}
  </Card.Header>
  <Card.Content>
    {@render children()}
  </Card.Content>
</Card.Root>
