<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  let { children, class: className }: { children: Snippet; class?: string } = $props();
</script>

<main class={cn('mx-auto min-h-screen w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-10', className)}>
  {@render children()}
</main>
