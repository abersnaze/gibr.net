<script>
  import { createEventDispatcher } from 'svelte';

  export let content;
  export let root = undefined;
  export let path = "";

  let content_type = typeof content;
  const dispatch = createEventDispatcher();

  // Handle selection of a key or value
  function handleSelect(selectedPath, selectedValue) {
    console.log('[TreeDisplay] Selection:', { path: selectedPath, value: selectedValue });

    // Dispatch to parent (eventually bubbles up to Step component)
    dispatch('path-select', {
      path: selectedPath,
      value: selectedValue
    });
  }

  // Handle key click - selects the value at that key
  function handleKeyClick(key) {
    const keyPath = path + "." + key;
    handleSelect(keyPath, content[key]);
  }

  // Handle value click - selects that specific value
  function handleValueClick(valuePath, value) {
    handleSelect(valuePath, value);
  }
</script>

{#if content_type === "object"}
  {#if Array.isArray(content)}
    <ol start=0>
      {#each content as item, idx}
        <li>
          <svelte:self
            bind:content={item}
            bind:root
            path={path + "." + idx}
            on:path-select
          />
        </li>
      {/each}
    </ol>
  {:else if content}
    <dl>
      {#each Object.keys(content) as key}
        {#if content[key]}
          <dt
            class="clickable-key"
            on:click={() => handleKeyClick(key)}
            on:keydown={(e) => e.key === 'Enter' && handleKeyClick(key)}
            role="button"
            tabindex="0"
            title="Click to select this value"
          >{key}</dt>
          <dd>
            <svelte:self
              bind:content={content[key]}
              bind:root
              path={path + "." + key}
              on:path-select
            />
          </dd>
        {/if}
      {/each}
    </dl>
  {:else}
    <em>null</em>
  {/if}
{:else}
  <span
    class="clickable-value"
    on:click={() => handleValueClick(path, content)}
    on:keydown={(e) => e.key === 'Enter' && handleValueClick(path, content)}
    role="button"
    tabindex="0"
    title="Click to select this value"
  >{content}</span>
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

  .clickable-key,
  .clickable-value {
    cursor: pointer;
    transition: background-color 0.1s ease;
    outline: none;
  }

  .clickable-key:hover,
  .clickable-value:hover,
  .clickable-key:focus,
  .clickable-value:focus {
    background-color: rgba(100, 150, 255, 0.2);
    border-radius: 2px;
  }

  .clickable-key:focus,
  .clickable-value:focus {
    outline: 2px solid rgba(100, 150, 255, 0.5);
    outline-offset: 1px;
  }

  .clickable-key {
    padding: 0 0.2em;
    font-weight: 500;
  }

  .clickable-value {
    display: inline-block;
    padding: 0 0.2em;
  }
</style>
