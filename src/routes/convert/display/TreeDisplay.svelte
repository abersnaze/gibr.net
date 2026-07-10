<script>
  import { createEventDispatcher } from "svelte"

  export let content
  export let root = undefined
  export let path = ""
  export let depth = 0
  export let selectedPath = undefined

  $: content_type = typeof content
  const dispatch = createEventDispatcher()

  const AUTO_COLLAPSE_THRESHOLD = 10
  const BATCH_SIZE = 100

  $: totalItems =
    content_type === "object" && content
      ? Array.isArray(content)
        ? content.length
        : Object.keys(content).length
      : 0

  $: needsBatching = totalItems > BATCH_SIZE

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
          })),
        })
      } else {
        const keys = Object.keys(content)
        const batchKeys = keys.slice(start, end)
        result.push({
          start,
          end: end - 1,
          startKey: batchKeys[0],
          endKey: batchKeys[batchKeys.length - 1],
          items: batchKeys.map((key) => ({ key, value: content[key] })),
        })
      }
    }

    return result
  })()

  function isComplex(value) {
    return typeof value === "object" && value !== null
  }

  function getSize(value) {
    if (Array.isArray(value)) return value.length
    if (typeof value === "object" && value !== null) return Object.keys(value).length
    return 0
  }

  function handleSelect(selectPath, selectValue) {
    dispatch("path-select", { path: selectPath, value: selectValue })
  }
</script>

{#if content_type === "object"}
  {#if Array.isArray(content)}
    <details open={totalItems <= AUTO_COLLAPSE_THRESHOLD}>
      <summary>[{content.length}]</summary>
      {#if needsBatching && batches}
        <div class="batches-container">
          {#each batches as batch, batchIndex (batchIndex)}
            <details>
              <summary>[{batch.start}...{batch.end}]</summary>
              <ol class="array-list">
                {#each batch.items as item (item.key)}
                  <li>
                    <button
                      class="selectable"
                      class:selected={path + "." + item.key === selectedPath}
                      on:click|stopPropagation={() =>
                        handleSelect(path + "." + item.key, item.value)}
                      title="Select index {item.key}">{item.key}</button
                    >
                    <!-- bind into the real content, not the derived batch copy -->
                    <svelte:self
                      bind:content={content[item.key]}
                      bind:root
                      path={path + "." + item.key}
                      depth={depth + 1}
                      {selectedPath}
                      on:path-select
                    />
                  </li>
                {/each}
              </ol>
            </details>
          {/each}
        </div>
      {:else}
        <ol class="array-list">
          {#each content as item, idx (idx)}
            <li>
              <button
                class="selectable"
                class:selected={path + "." + idx === selectedPath}
                on:click|stopPropagation={() => handleSelect(path + "." + idx, item)}
                title="Select index {idx}">{idx}</button
              >
              <svelte:self
                bind:content={item}
                bind:root
                path={path + "." + idx}
                depth={depth + 1}
                {selectedPath}
                on:path-select
              />
            </li>
          {/each}
        </ol>
      {/if}
    </details>
  {:else if content}
    <details open={totalItems <= AUTO_COLLAPSE_THRESHOLD}>
      <summary>{`{${getSize(content)}}`}</summary>
      {#if needsBatching && batches}
        <div class="batches-container">
          {#each batches as batch, batchIndex (batchIndex)}
            <details>
              <summary>{"{"}{batch.startKey}...{batch.endKey}}</summary>
              <dl class="object-list">
                {#each batch.items as item (item.key)}
                  {#if item.value !== undefined}
                    <div class="key-value-row" class:complex={isComplex(item.value)}>
                      <dt>{item.key}</dt>
                      <dd>
                        <!-- bind into the real content, not the derived batch copy -->
                        <svelte:self
                          bind:content={content[item.key]}
                          bind:root
                          path={path + "." + item.key}
                          depth={depth + 1}
                          {selectedPath}
                          on:path-select
                        />
                      </dd>
                    </div>
                  {/if}
                {/each}
              </dl>
            </details>
          {/each}
        </div>
      {:else}
        <dl class="object-list">
          {#each Object.keys(content) as key (key)}
            {#if content[key] !== undefined}
              <div class="key-value-row" class:complex={isComplex(content[key])}>
                <dt>{key}</dt>
                <dd>
                  <svelte:self
                    bind:content={content[key]}
                    bind:root
                    path={path + "." + key}
                    depth={depth + 1}
                    {selectedPath}
                    on:path-select
                  />
                </dd>
              </div>
            {/if}
          {/each}
        </dl>
      {/if}
    </details>
  {:else}
    <em>null</em>
  {/if}
{:else}
  <span
    class="selectable"
    class:selected={path === selectedPath}
    on:click={() => handleSelect(path, content)}
    on:keydown={(e) => e.key === "Enter" && handleSelect(path, content)}
    role="button"
    tabindex="0"
    title="Click to select this value">{content}</span
  >
{/if}

<style>
  details {
    margin: 0.15em 0;
  }

  :global(.display-container) > details {
    margin: 0.5em 0;
  }

  summary {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    padding: 0.1em 0.5em;
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    cursor: pointer;
    font-size: 0.85em;
    font-family: inherit;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: "▶";
    font-size: 0.7em;
    display: inline-block;
    transition: transform 0.15s ease;
  }

  details[open] > summary::before {
    transform: rotate(90deg);
  }

  summary:hover {
    background-color: var(--text-color);
    color: var(--bg-color);
  }

  /* Indent everything under a summary */
  details > :not(summary) {
    margin-left: 1.2em;
  }

  .batches-container {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .object-list {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    margin: 0;
  }

  .array-list {
    list-style: none;
    padding-left: 0.5em;
    margin: 0;
  }

  .array-list li {
    display: flex;
    align-items: baseline;
    gap: 0.3em;
  }

  /* Shared style for all selectable inline elements (values and array indices) */
  .selectable {
    display: inline-flex;
    align-items: center;
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.1em 0.5em;
    cursor: pointer;
  }

  .selectable:hover,
  .selectable:focus-visible,
  .selectable.selected {
    background-color: var(--text-color);
    color: var(--bg-color);
    outline: none;
  }

  /* Reset button-specific defaults */
  button.selectable {
    font-family: inherit;
    font-size: inherit;
  }

  /* Key-value rows: simple values inline, complex values block */
  .key-value-row dt {
    font-weight: 500;
    display: inline;
  }

  .key-value-row dt::after {
    content: ": ";
  }

  .key-value-row dd {
    display: inline;
    margin-left: 0;
  }

  .key-value-row.complex {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .key-value-row.complex dt {
    display: revert;
  }

  .key-value-row.complex dt::after {
    content: ":";
  }

  .key-value-row.complex dd {
    display: revert;
    margin-left: 1.2em;
  }

  em {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
