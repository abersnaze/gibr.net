<script lang="ts">
  import Logo from "../../home/Logo.svelte"
  import HelpButton from "../../home/HelpButton.svelte"
  import Step from "./Step.svelte"
  import type { DisplayName, Step as StepType } from "./model"
  import { applyStepUpdate } from "./pipeline"
  import { buildShareableUrl, restoreStepsFromUrl } from "./urlState"
  import { browser } from "$app/environment"
  import { tick, setContext } from "svelte"
  import { writable } from "svelte/store"

  if (browser) {
    document.title = "GIBR.net: Convert Things"
  }

  function defaultSteps(): StepType[] {
    return [
      {
        content: "", // Start with empty content
        curr: "TextDisplay" as DisplayName,
        transform_id: null, // transform_id to the next step
      },
    ]
  }

  // Track the entire conversion chain for bidirectional editing. Restored
  // from the URL's `s` param when a shared link was opened.
  let steps: StepType[] = (browser && restoreStepsFromUrl(window.location.search)) || defaultSteps()

  // Store to pause step analysis during bulk updates to prevent flickering
  const pauseAnalysis = writable(false)
  setContext("pauseAnalysis", pauseAnalysis)

  // Keep the URL in sync with the chain so it can be bookmarked or shared.
  // Falls back to the bare path when the input isn't plain text or the
  // encoded state would make the URL too long.
  $: if (browser) {
    const shareable = buildShareableUrl(steps, window.location.href)
    const target = shareable ?? `${window.location.origin}${window.location.pathname}`
    if (target !== window.location.href) {
      window.history.replaceState(null, "", target)
    }
  }

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
  <HelpButton label="Convert Things help">
    <h2>Convert Things</h2>
    <p>Chain data transformations together and edit the data at any step along the way.</p>
    <ul>
      <li>Type or paste content into the first box</li>
      <li>
        The tool detects possible transforms (Base64, JSON, UTF-8, dates, and more) and shows them
        as chips below, ranked by confidence
      </li>
      <li>Click a chip to apply that transform — it adds a new step showing the result</li>
      <li>Click a different chip on any step to swap the transform used there</li>
      <li>
        Edit the content at any step and changes propagate backward to earlier steps and forward
        through the rest of the chain
      </li>
      <li>
        In a tree view, click a key or value to extract it into a new step; in a text view, select
        text to extract that substring
      </li>
    </ul>
  </HelpButton>
  <h1><Logo /> Convert Things</h1>
  {#each steps as step, index (index)}
    <section aria-label="Transformation step {index + 1}">
      <Step bind:step {index} onupdate={handleUpdate} />
    </section>
  {/each}
</main>
