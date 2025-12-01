<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let value: string = "ms" // Just the unit, not "unit:timezone"

  const dispatch = createEventDispatcher()

  function handleChange(event: Event) {
    const select = event.target as HTMLSelectElement
    value = select.value
    dispatch("change", { value })
  }
</script>

<div class="epoch-options">
  <label>Time Unit:</label>
  <select bind:value on:change={handleChange}>
    <option value="ms">Milliseconds</option>
    <option value="sec">Seconds</option>
    <option value="ns">Nanoseconds</option>
  </select>
</div>

<style>
  .epoch-options {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.9em;
  }

  label {
    opacity: 0.7;
  }

  select {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.3em 0.5em;
    font-family: inherit;
    font-size: 1em;
  }
</style>
