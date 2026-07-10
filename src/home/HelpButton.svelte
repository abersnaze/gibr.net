<script lang="ts">
  export let label = "Help"

  let open = false

  function toggle() {
    open = !open
  }
  function close() {
    open = false
  }
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close()
  }
</script>

<svelte:window on:keydown={open ? handleKeydown : undefined} />

<button
  class="help-btn"
  type="button"
  aria-label={label}
  aria-haspopup="dialog"
  aria-expanded={open}
  on:click={toggle}
>
  ?
</button>

{#if open}
  <div class="backdrop" role="presentation" on:click={close}>
    <div class="panel" role="dialog" aria-modal="true" aria-label={label} on:click|stopPropagation>
      <button class="close-btn" type="button" aria-label="Close help" on:click={close}>
        &times;
      </button>
      <slot />
    </div>
  </div>
{/if}

<style>
  .help-btn {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--button-bg);
    color: var(--text-secondary);
    font-size: 1.1rem;
    font-weight: bold;
    line-height: 1;
    padding: 0;
    cursor: pointer;
  }

  .help-btn:hover {
    color: var(--text-color);
    border-color: var(--button-border-focus);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 1rem;
  }

  .panel {
    position: relative;
    background: var(--bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 480px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }

  .close-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0.25rem;
  }

  .close-btn:hover {
    color: var(--status-error-color);
  }

  .panel :global(h2) {
    margin-top: 0;
    font-size: 1.4rem;
  }

  .panel :global(p) {
    margin: 0.5rem 0;
    line-height: 1.4;
  }

  .panel :global(ul) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
    line-height: 1.4;
  }

  .panel :global(li) {
    margin: 0.25rem 0;
  }

  .panel :global(code) {
    background: var(--toggle-bg);
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    .help-btn {
      top: 0.5rem;
      right: 0.5rem;
    }
  }
</style>
