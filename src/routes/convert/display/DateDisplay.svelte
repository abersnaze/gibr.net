<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let content: string | number | Date // ISO string, epoch milliseconds, or Date

  const dispatch = createEventDispatcher()

  // Timezone state (default to local)
  let timezone: "local" | "UTC" = "local"

  // Format date with timezone
  function formatDateWithTimezone(date: Date, tz: "local" | "UTC"): string {
    if (tz === "UTC") {
      return date.toISOString()
    } else {
      // Format with local timezone offset
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const day = date.getDate().toString().padStart(2, "0")
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      const seconds = date.getSeconds().toString().padStart(2, "0")
      const milliseconds = date.getMilliseconds().toString().padStart(3, "0")

      // Get timezone offset
      const offsetMinutes = -date.getTimezoneOffset()
      const offsetSign = offsetMinutes >= 0 ? "+" : "-"
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
        .toString()
        .padStart(2, "0")
      const offsetMins = (Math.abs(offsetMinutes) % 60).toString().padStart(2, "0")
      const offset = `${offsetSign}${offsetHours}:${offsetMins}`

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offset}`
    }
  }

  // Convert content to display format (ISO string with timezone)
  $: displayValue = (() => {
    if (content instanceof Date) {
      return formatDateWithTimezone(content, timezone)
    } else if (typeof content === "number") {
      return formatDateWithTimezone(new Date(content), timezone)
    } else {
      return content
    }
  })()

  // Track the current edited value (before applying)
  let editedValue = displayValue
  let hasChanges = false

  // Update editedValue when content changes from outside
  $: {
    editedValue = displayValue
    hasChanges = false
  }

  // Validate the current edited value
  $: dateObj = new Date(editedValue)
  $: isValid = !isNaN(dateObj.getTime())
  $: canApply = hasChanges && isValid

  // Relative date menu state
  let showRelativeMenu = false

  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement
    editedValue = input.value
    hasChanges = editedValue !== displayValue
  }

  function handleApply() {
    if (canApply) {
      dispatch("content-change", { content: new Date(editedValue) })
      hasChanges = false
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && canApply) {
      event.preventDefault()
      handleApply()
    }
  }

  function setRelativeDate(type: string) {
    const now = new Date()

    switch (type) {
      case "year-ago":
        now.setFullYear(now.getFullYear() - 1)
        break
      case "month-ago":
        now.setMonth(now.getMonth() - 1)
        break
      case "week-ago":
        now.setDate(now.getDate() - 7)
        break
      case "yesterday":
        now.setDate(now.getDate() - 1)
        break
      case "now":
        // Current time, no change needed
        break
      case "tomorrow":
        now.setDate(now.getDate() + 1)
        break
      case "week-from":
        now.setDate(now.getDate() + 7)
        break
      case "month-from":
        now.setMonth(now.getMonth() + 1)
        break
      case "year-from":
        now.setFullYear(now.getFullYear() + 1)
        break
    }

    editedValue = formatDateWithTimezone(now, timezone)
    hasChanges = editedValue !== displayValue
    showRelativeMenu = false
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest(".relative-menu-container")) {
      showRelativeMenu = false
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="date-display">
  <div class="date-field">
    <div class="input-row">
      <select class="timezone-select" bind:value={timezone}>
        <option value="local">Local</option>
        <option value="UTC">UTC</option>
      </select>
      <div class="relative-menu-container">
        <button
          class="set-to-button"
          type="button"
          on:click|stopPropagation={() => (showRelativeMenu = !showRelativeMenu)}
        >
          Set to ▼
        </button>
        {#if showRelativeMenu}
          <div class="relative-menu">
            <button type="button" on:click={() => setRelativeDate("year-ago")}>year ago</button>
            <button type="button" on:click={() => setRelativeDate("month-ago")}>month ago</button>
            <button type="button" on:click={() => setRelativeDate("week-ago")}>week ago</button>
            <button type="button" on:click={() => setRelativeDate("yesterday")}>yesterday</button>
            <button type="button" on:click={() => setRelativeDate("now")}>now</button>
            <button type="button" on:click={() => setRelativeDate("tomorrow")}>tomorrow</button>
            <button type="button" on:click={() => setRelativeDate("week-from")}>week from</button>
            <button type="button" on:click={() => setRelativeDate("month-from")}>month from</button>
            <button type="button" on:click={() => setRelativeDate("year-from")}>year from</button>
          </div>
        {/if}
      </div>
      <input
        id="iso-string"
        type="text"
        class:invalid={!isValid}
        class:has-changes={hasChanges}
        value={editedValue}
        on:input={handleInput}
        on:keydown={handleKeydown}
        placeholder="YYYY-MM-DDTHH:mm:ss.sssZ or ±HH:mm"
      />
      <button
        class="apply-button"
        disabled={!canApply}
        on:click={handleApply}
        title={!isValid ? "Invalid date format" : hasChanges ? "Apply changes" : "No changes"}
      >
        Apply
      </button>
      {#if !isValid}
        <div class="error">
          <span class="warning-icon">⚠</span>
          Invalid date format
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .date-display {
    display: flex;
    flex-direction: column;
    gap: 1em;
    font-family: inherit;
    width: 100%;
    max-width: 800px;
  }

  .date-field {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .input-row {
    display: flex;
    gap: 0.5em;
    align-items: stretch;
  }

  .relative-menu-container {
    position: relative;
  }

  .set-to-button {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.5em 0.8em;
    font-family: inherit;
    font-size: 0.9em;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s;
  }

  .set-to-button:hover {
    background-color: rgba(128, 128, 128, 0.1);
  }

  .timezone-select {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.5em 0.8em;
    font-family: inherit;
    font-size: 0.9em;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .timezone-select:hover {
    background-color: rgba(128, 128, 128, 0.1);
  }

  .relative-menu {
    position: absolute;
    left: calc(100% + 0.1em);
    transform: translateY(calc(-0.5em - 0.3em - 1px - 4.5 * 2.2em));
    background-color: var(--bg-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.3em;
    z-index: 1000;
    min-width: 150px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .relative-menu button {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 0.3em 0.8em;
    text-align: left;
    cursor: pointer;
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.9em;
    border-radius: 0.2em;
    transition: background-color 0.2s;
  }

  .relative-menu button:hover {
    background-color: rgba(128, 128, 128, 0.2);
  }

  .date-field input {
    flex: 1;
    min-width: 19em;
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.5em;
    font-family: monospace;
    font-size: 1em;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  .date-field input.invalid {
    border-color: var(--status-error-color);
    background-color: rgba(255, 0, 0, 0.05);
  }

  .date-field input.has-changes {
    border-color: var(--text-color);
    opacity: 1;
  }

  .apply-button {
    background-color: var(--text-color);
    color: var(--bg-color);
    border: none;
    border-radius: 0.3em;
    padding: 0.5em 1em;
    font-family: inherit;
    font-size: 1em;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s;
  }

  .apply-button:hover:not(:disabled) {
    opacity: 0.8;
  }

  .apply-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .error {
    display: flex;
    align-items: center;
    gap: 0.3em;
    color: var(--status-error-color);
    font-size: 0.9em;
  }

  .warning-icon {
    font-weight: bold;
  }

  .date-info {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    padding: 0.5em;
    background-color: var(--bg-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    font-size: 0.9em;
  }

  .info-row {
    display: flex;
    gap: 0.5em;
  }

  .info-row .label {
    opacity: 0.7;
    min-width: 150px;
  }

  .info-row .value {
    font-family: monospace;
  }
</style>
