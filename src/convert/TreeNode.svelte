<script>
  export let content;
  export let root = undefined;
  export let path = "";

  let content_type = typeof content;
</script>

{#if content_type === "object"}
  {#if Array.isArray(content)}
    <ol>
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
    display: flex;
    flex-flow: row wrap;
  }
  dt {
    flex-basis: 20%;
    padding: 2px 4px;
    text-align: right;
  }
  dt:after {
    content: ":";
  }
  dd {
    flex-basis: 70%;
    flex-grow: 1;
    margin: 0;
  }
  ol {
    counter-reset: item;
    list-style-type: none;
  }
  ol li:before {
    content: counter(level1) ": "; /*Instead of ". " */
    counter-increment: level1;
  }
</style>
