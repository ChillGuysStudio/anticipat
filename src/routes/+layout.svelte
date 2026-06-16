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

<ClerkProvider
  appearance={{
    variables: {
      colorBackground: 'var(--card)',
      colorDanger: 'var(--destructive)',
      colorForeground: 'var(--card-foreground)',
      colorInput: 'var(--input)',
      colorInputForeground: 'var(--card-foreground)',
      colorMuted: 'var(--muted)',
      colorMutedForeground: 'var(--muted-foreground)',
      colorNeutral: 'var(--foreground)',
      colorPrimary: 'var(--primary)',
      colorPrimaryForeground: 'var(--primary-foreground)'
    },
    elements: {
      modalBackdrop: {
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
      }
    }
  }}
>
  {@render children()}
</ClerkProvider>
