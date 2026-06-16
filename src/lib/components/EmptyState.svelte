<script lang="ts">
  import * as Card from '$lib/components/ui/card/index.js';

  let { title, description }: { title: string; description: string } = $props();
</script>

<Card.Root class="shadow-none">
  <Card.Content class="space-y-2 p-6 text-center">
    <h3 class="text-lg font-semibold">{title}</h3>
    <p class="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
  </Card.Content>
</Card.Root>
