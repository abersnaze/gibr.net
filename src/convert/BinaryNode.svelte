<script>
  export let content;
</script>

{#each content as byte}
  {byte.toString(16)}
{/each}
