<script>
  import { createEventDispatcher } from "svelte"

  export let content
  export let root = undefined
  export let path = ""
  export let depth = 0

  let content_type = typeof content
  const dispatch = createEventDispatcher()

  // Track collapsed state for this node
  let collapsed = false

  // Auto-collapse threshold: objects/arrays with more than this many items
  const AUTO_COLLAPSE_THRESHOLD = 10

  // Batching configuration
  const BATCH_SIZE = 100

  // Determine if this node should be auto-collapsed
  $: {
    if (content_type === "object" && content) {
      const size = Array.isArray(content) ? content.length : Object.keys(content).length
      if (size > AUTO_COLLAPSE_THRESHOLD) {
        collapsed = true
      }
    }
  }

  // Get total number of items
  $: totalItems =
    content_type === "object" && content
      ? Array.isArray(content)
        ? content.length
        : Object.keys(content).length
      : 0

  // Check if we need batching
  $: needsBatching = totalItems > BATCH_SIZE

  // Create batches with their own collapsed state
  $: batches = (() => {
    if (!needsBatching || content_type !== "object" || !content) {
      return null
    }

    const totalBatches = Math.ceil(totalItems / BATCH_SIZE)
    const result = []

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, totalItems)

      if (Array.isArray(content)) {
        result.push({
          start,
          end: end - 1,
          items: content.slice(start, end).map((item, idx) => ({
            key: start + idx,
            value: item,
            isArray: true,
          })),
          collapsed: true, // Start collapsed
        })
      } else {
        const keys = Object.keys(content)
        const batchKeys = keys.slice(start, end)
        result.push({
          start,
          end: end - 1,
          startKey: batchKeys[0],
          endKey: batchKeys[batchKeys.length - 1],
          items: batchKeys.map((key) => ({
            key,
            value: content[key],
            isArray: false,
          })),
          collapsed: true, // Start collapsed
        })
      }
    }

    return result
  })()

  // Toggle batch collapsed state
  function toggleBatch(batchIndex, event) {
    event.stopPropagation()
    if (batches) {
      batches[batchIndex].collapsed = !batches[batchIndex].collapsed
      batches = [...batches] // Trigger reactivity
    }
  }

  // Check if a value is complex (object or array)
  function isComplex(value) {
    return typeof value === "object" && value !== null
  }

  // Get size of object/array for display
  function getSize(value) {
    if (Array.isArray(value)) return value.length
    if (typeof value === "object" && value !== null) return Object.keys(value).length
    return 0
  }

  // Handle selection of a key or value
  function handleSelect(selectedPath, selectedValue) {
    console.log("[TreeDisplay] Selection:", { path: selectedPath, value: selectedValue })

    // Dispatch to parent (eventually bubbles up to Step component)
    dispatch("path-select", {
      path: selectedPath,
      value: selectedValue,
    })
  }

  // Handle value click - selects that specific value
  function handleValueClick(valuePath, value) {
    handleSelect(valuePath, value)
  }

  // Toggle collapse/expand
  function toggleCollapse(event) {
    event.stopPropagation()
    collapsed = !collapsed
  }
</script>

{#if content_type === "object"}
  {#if Array.isArray(content)}
    <div class="array-container">
      <button
        class="toggle-btn"
        on:click={toggleCollapse}
        aria-label={collapsed ? "Expand" : "Collapse"}
      >
        <span class="toggle-icon" class:collapsed>{collapsed ? "▶" : "▼"}</span>
        <span class="type-label">[{content.length}]</span>
      </button>
      {#if !collapsed}
        {#if needsBatching && batches}
          <!-- Show batches as collapsible ranges -->
          <div class="batches-container">
            {#each batches as batch, batchIndex (batchIndex)}
              <div class="batch-section">
                <button
                  class="batch-toggle-btn"
                  on:click={(e) => toggleBatch(batchIndex, e)}
                  aria-label={batch.collapsed ? "Expand" : "Collapse"}
                >
                  <span class="toggle-icon" class:collapsed={batch.collapsed}
                    >{batch.collapsed ? "▶" : "▼"}</span
                  >
                  <span class="batch-range">[{batch.start}...{batch.end}]</span>
                </button>
                {#if !batch.collapsed}
                  <ol start={batch.start} class="array-list">
                    {#each batch.items as item (item.key)}
                      <li>
                        <svelte:self
                          bind:content={item.value}
                          bind:root
                          path={path + "." + item.key}
                          depth={depth + 1}
                          on:path-select
                        />
                      </li>
                    {/each}
                  </ol>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <!-- Small array, show all items -->
          <ol start="0" class="array-list">
            {#each content as item, idx (idx)}
              <li>
                <svelte:self
                  bind:content={item}
                  bind:root
                  path={path + "." + idx}
                  depth={depth + 1}
                  on:path-select
                />
              </li>
            {/each}
          </ol>
        {/if}
      {/if}
    </div>
  {:else if content}
    <div class="object-container">
      <button
        class="toggle-btn"
        on:click={toggleCollapse}
        aria-label={collapsed ? "Expand" : "Collapse"}
      >
        <span class="toggle-icon" class:collapsed>{collapsed ? "▶" : "▼"}</span>
        <span class="type-label">{`{${getSize(content)}}`}</span>
      </button>
      {#if !collapsed}
        {#if needsBatching && batches}
          <!-- Show batches as collapsible ranges -->
          <div class="batches-container">
            {#each batches as batch, batchIndex (batchIndex)}
              <div class="batch-section">
                <button
                  class="batch-toggle-btn"
                  on:click={(e) => toggleBatch(batchIndex, e)}
                  aria-label={batch.collapsed ? "Expand" : "Collapse"}
                >
                  <span class="toggle-icon" class:collapsed={batch.collapsed}
                    >{batch.collapsed ? "▶" : "▼"}</span
                  >
                  <span class="batch-range">{"{"}{batch.startKey}...{batch.endKey}}</span>
                </button>
                {#if !batch.collapsed}
                  <dl class="object-list">
                    {#each batch.items as item (item.key)}
                      {#if item.value !== undefined}
                        {#if isComplex(item.value)}
                          <!-- Complex value: display on next line -->
                          <div class="key-value-row complex">
                            <dt>{item.key}</dt>
                            <dd class="complex-value">
                              <svelte:self
                                bind:content={item.value}
                                bind:root
                                path={path + "." + item.key}
                                depth={depth + 1}
                                on:path-select
                              />
                            </dd>
                          </div>
                        {:else}
                          <!-- Simple value: display inline -->
                          <div class="key-value-row simple">
                            <dt>{item.key}</dt>
                            <dd>
                              <svelte:self
                                bind:content={item.value}
                                bind:root
                                path={path + "." + item.key}
                                depth={depth + 1}
                                on:path-select
                              />
                            </dd>
                          </div>
                        {/if}
                      {/if}
                    {/each}
                  </dl>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <!-- Small object, show all keys -->
          <dl class="object-list">
            {#each Object.keys(content) as key (key)}
              {#if content[key] !== undefined}
                {#if isComplex(content[key])}
                  <!-- Complex value: display on next line -->
                  <div class="key-value-row complex">
                    <dt>{key}</dt>
                    <dd class="complex-value">
                      <svelte:self
                        bind:content={content[key]}
                        bind:root
                        path={path + "." + key}
                        depth={depth + 1}
                        on:path-select
                      />
                    </dd>
                  </div>
                {:else}
                  <!-- Simple value: display inline -->
                  <div class="key-value-row simple">
                    <dt>{key}</dt>
                    <dd>
                      <svelte:self
                        bind:content={content[key]}
                        bind:root
                        path={path + "." + key}
                        depth={depth + 1}
                        on:path-select
                      />
                    </dd>
                  </div>
                {/if}
              {/if}
            {/each}
          </dl>
        {/if}
      {/if}
    </div>
  {:else}
    <em>null</em>
  {/if}
{:else}
  <span
    class="clickable-value"
    on:click={() => handleValueClick(path, content)}
    on:keydown={(e) => e.key === "Enter" && handleValueClick(path, content)}
    role="button"
    tabindex="0"
    title="Click to select this value">{content}</span
  >
{/if}

<style>
  .array-container,
  .object-container {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    margin: 0.15em 0;
  }

  /* Only add larger margin to root level tree display */
  :global(.display-container) > .array-container,
  :global(.display-container) > .object-container {
    margin: 0.5em 0;
  }

  .toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    padding: 0.1em 0.3em;
    background: var(--toggle-bg);
    border: 1px solid var(--toggle-border);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85em;
    font-family: inherit;
    transition: background-color 0.1s ease;
    max-width: fit-content;
  }

  .toggle-btn:hover {
    background: var(--toggle-bg-hover);
  }

  .batches-container {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-left: 1.2em;
  }

  .batch-section {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .batch-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    padding: 0.1em 0.3em;
    background: var(--batch-toggle-bg);
    border: 1px solid var(--batch-toggle-border);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85em;
    font-family: inherit;
    transition: background-color 0.1s ease;
    max-width: fit-content;
  }

  .batch-toggle-btn:hover {
    background: var(--batch-toggle-bg-hover);
  }

  .batch-range {
    color: var(--text-subtle);
    font-size: 0.9em;
  }

  .toggle-icon {
    font-size: 0.7em;
    transition: transform 0.15s ease;
  }

  .type-label {
    color: var(--text-dim);
    font-size: 0.9em;
  }

  .object-list,
  .array-list {
    margin: 0;
  }

  /* For non-batched content, add left margin */
  .array-container > .array-list,
  .object-container > .object-list {
    margin-left: 1.2em;
  }

  /* For batched content, the margin is on batches-container */
  .batch-section .array-list,
  .batch-section .object-list {
    margin-left: 1.2em;
  }

  .object-list {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .array-list {
    padding-left: 1.5em;
    list-style: decimal;
  }

  .array-list li {
    padding-left: 0.3em;
  }

  /* Key-value rows for simple values */
  .key-value-row.simple {
    display: block;
  }

  .key-value-row.simple dt {
    display: inline;
  }

  .key-value-row.simple dt:after {
    content: ": ";
  }

  .key-value-row.simple dd {
    display: inline;
    margin-left: 0;
  }

  /* Key-value rows for complex values */
  .key-value-row.complex {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .key-value-row.complex dt:after {
    content: ":";
  }

  .complex-value {
    margin-left: 1.2em;
  }

  dt {
    font-weight: 500;
  }

  .clickable-value {
    cursor: pointer;
    transition: background-color 0.1s ease;
    outline: none;
    border-radius: 2px;
    display: inline-block;
    padding: 0 0.2em;
  }

  .clickable-value:hover,
  .clickable-value:focus {
    background-color: var(--clickable-hover);
  }

  .clickable-value:focus {
    outline: 2px solid var(--clickable-focus);
    outline-offset: 1px;
  }

  em {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
