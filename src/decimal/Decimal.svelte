<script lang="ts">
  import Logo from "../home/Logo.svelte"
  import TapeMeasure from "./TapeMeasure.svelte"
  import { toFraction, type FractionEntry } from "./model"
  import { onMount } from "svelte"

  document.title = "GIBR.net: Decimal to Fraction"

  let input = ""
  let precision = 16
  let entries: FractionEntry[] = []
  let initialized = false
  let nextId = 1
  let error = ""

  const precisionOptions = [4, 8, 16, 32, 64]

  onMount(() => {
    const params = new URLSearchParams(window.location.search)

    // Load precision from URL or localStorage
    const saved = localStorage.getItem("decimal-precision")
    if (saved) {
      const p = parseInt(saved)
      if (precisionOptions.includes(p)) precision = p
    }

    // Load entries from URL params (priority) or localStorage
    const xParams = params.getAll("x")
    if (xParams.length > 0) {
      for (const x of xParams) {
        const match = x.match(/^(-?[\d.]+)\/(\d+)$/)
        if (match) {
          const num = parseFloat(match[1])
          const denom = parseInt(match[2])
          if (!isNaN(num) && precisionOptions.includes(denom)) {
            const entry = toFraction(num, denom)
            entry.id = nextId++
            entries = [...entries, entry]
          }
        }
      }
    } else {
      const savedEntries = localStorage.getItem("decimal-entries")
      if (savedEntries) {
        try {
          const parsed = JSON.parse(savedEntries)
          if (Array.isArray(parsed)) {
            entries = parsed
            nextId = entries.reduce((max: number, e: FractionEntry) => Math.max(max, e.id), 0) + 1
          }
        } catch {
          // Use defaults
        }
      }
    }

    initialized = true
  })

  function updateUrl() {
    const qs = entries.map((e) => `x=${e.decimal}/${e.maxDenominator}`).join("&")
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? "?" + qs : ""}`)
  }

  function addEntry() {
    error = ""
    const trimmed = input.trim()
    if (!trimmed) return

    const num = parseFloat(trimmed)
    if (isNaN(num)) {
      error = "Enter a valid number"
      return
    }

    const entry = toFraction(num, precision)
    entry.id = nextId++
    entries = [...entries, entry]
    input = ""

    const el = document.getElementById("decimal-input")
    el?.focus()
  }

  function removeEntry(id: number) {
    entries = entries.filter((e) => e.id !== id)
  }

  function clearAll() {
    entries = []
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      addEntry()
    }
  }

  $: {
    if (initialized && typeof window !== "undefined") {
      localStorage.setItem("decimal-precision", String(precision))
      localStorage.setItem("decimal-entries", JSON.stringify(entries))
      updateUrl()
    }
  }
</script>

<main>
  <h1><Logo /> Decimal to Fraction</h1>

  <section class="input-section">
    <div class="input-row">
      <div class="input-group">
        <label for="decimal-input">Decimal</label>
        <input
          id="decimal-input"
          type="text"
          inputmode="decimal"
          bind:value={input}
          on:keydown={handleKeydown}
          placeholder="3.625"
        />
      </div>
      <div class="input-group">
        <label for="precision-select">Nearest</label>
        <select id="precision-select" bind:value={precision}>
          {#each precisionOptions as opt (opt)}
            <option value={opt}>1/{opt}</option>
          {/each}
        </select>
      </div>
      <button class="add-btn" on:click={addEntry}>Add</button>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </section>

  {#if entries.length > 0}
    <section class="entries">
      {#each entries as entry (entry.id)}
        <div class="entry">
          <div class="entry-header">
            <span class="decimal-value">{entry.decimal}</span>
            <span class="equals">=</span>
            <span class="fraction-value">
              {#if entry.negative}-{/if}{#if entry.numerator === 0}{entry.wholePart}{:else if entry.wholePart === 0}<sup
                  >{entry.numerator}</sup
                >/<sub>{entry.denominator}</sub>{:else}{entry.wholePart}
                <sup>{entry.numerator}</sup>/<sub>{entry.denominator}</sub>{/if}
            </span>
            <span class="precision-badge">1/{entry.maxDenominator}</span>
            <button
              class="remove-btn"
              on:click={() => removeEntry(entry.id)}
              aria-label="Remove entry"
            >
              &times;
            </button>
          </div>
          <TapeMeasure {entry} />
        </div>
      {/each}
      <button class="clear-btn" on:click={clearAll}>Clear All</button>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: none;
  }

  .input-section {
    margin-bottom: 1.5rem;
  }

  .input-row {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .input-group label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .input-group input {
    width: 140px;
  }

  .add-btn {
    cursor: pointer;
  }

  .error {
    color: var(--status-error-color);
    background: var(--status-error-bg);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .entry {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    max-width: 600px;
  }

  .entry-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .decimal-value {
    font-size: 1.2rem;
    font-weight: bold;
  }

  .equals {
    color: var(--text-secondary);
  }

  .fraction-value {
    font-size: 1.2rem;
  }

  .fraction-value :global(sup),
  .fraction-value :global(sub) {
    font-size: 0.75em;
  }

  .precision-badge {
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: var(--toggle-bg);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    margin-left: auto;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0 0.25rem;
    line-height: 1;
  }

  .remove-btn:hover {
    color: var(--status-error-color);
  }

  .clear-btn {
    align-self: flex-start;
    padding: 0.3rem 0.7rem;
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .clear-btn:hover {
    color: var(--status-error-color);
    border-color: var(--status-error-color);
  }

  @media (max-width: 768px) {
    .input-row {
      flex-direction: column;
      align-items: stretch;
    }

    .input-group input {
      width: 100%;
    }
  }
</style>
