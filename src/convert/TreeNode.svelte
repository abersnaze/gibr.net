<script>
  export let content;
  export let root = undefined;
  export let path = "";

  let content_type = typeof content;
</script>

{#if content_type === "object"}
  {#if Array.isArray(content)}
    <ol start=0>
      {#each content as item, idx}
        <li>
          <svelte:self bind:content={item} bind:root path={path + "." + idx} />
        </li>
      {/each}
    </ol>
  {:else if content}
    <dl>
      {#each Object.keys(content) as key}
        {#if content[key]}
          <dt contenteditable>{key}</dt>
          <dd>
            <svelte:self
              bind:content={content[key]}
              bind:root
              path={path + "." + key}
            />
          </dd>
        {/if}
      {/each}
    </dl>
  {:else}
    <em>null</em>
  {/if}
{:else}
  <span contenteditable bind:textContent={content} />
{/if}

<style>
  dl {
    margin-block: 0;
    display: grid;
    grid-template-columns: min-content auto;
  }
  dt {
    justify-self: end;
    grid-column: 1;
  }
  dt:after {
    content: ":";
  }
  dd {
    margin-left: 0;
    grid-column: 2;
  }
  ol {
    margin-block: 0;
  }
</style>
