<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ClerkProvider } from 'svelte-clerk';
  import '../app.css';

  const { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>Anticipat</title>
  <meta name="description" content="Prima Casă Plus repayment planner — plan your early repayment" />
</svelte:head>

<ClerkProvider>
  {@render children()}
</ClerkProvider>
