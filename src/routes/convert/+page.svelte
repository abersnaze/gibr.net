<script lang="ts">
  import Logo from "../../home/Logo.svelte"
  import Step from "./Step.svelte"
  import type { DisplayName, Step as StepType } from "./model"
  import { applyStepUpdate } from "./pipeline"
  import { browser } from "$app/environment"
  import { tick, setContext } from "svelte"
  import { writable } from "svelte/store"

  if (browser) {
    document.title = "GIBR.net: Convert Things"
  }

  // Track the entire conversion chain for bidirectional editing
  let steps: StepType[] = [
    {
      content: "", // Start with empty content
      curr: "TextDisplay" as DisplayName,
      transform_id: null, // transform_id to the next step
      inverse: undefined, // Store the inverse function for this step
    },
  ]

  // Store to pause step analysis during bulk updates to prevent flickering
  const pauseAnalysis = writable(false)
  setContext("pauseAnalysis", pauseAnalysis)

  // Handle updates from child steps. All propagation logic lives in
  // pipeline.ts; this component only pauses per-step analysis while the
  // chain is recomputed and resumes it after the DOM has settled.
  async function handleUpdate(event) {
    const { index, result, clearSubsequent } = event.detail

    pauseAnalysis.set(true)
    try {
      steps = applyStepUpdate(steps, {
        index,
        result: result ?? null,
        clearSubsequent: clearSubsequent ?? false,
      })
    } finally {
      await tick() // Wait for DOM update before resuming analysis
      pauseAnalysis.set(false)
    }
  }
</script>

<main>
  <h1><Logo /> Convert Things</h1>
  {#each steps as step, index (index)}
    <section aria-label="Transformation step {index + 1}">
      <Step bind:step {index} onupdate={handleUpdate} />
    </section>
  {/each}
</main>
