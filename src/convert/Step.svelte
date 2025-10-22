<script lang="ts">
  import { analyze, defaultOpts } from "./transforms/index";
  import { onMount, onDestroy } from 'svelte';
  import TextDisplay from "./display/TextDisplay.svelte";
  import BinaryDisplay from "./display/BinaryDisplay.svelte";
  import TreeDisplay from "./display/TreeDisplay.svelte";

  export let index: number;
  export let step: any;
  export let onupdate: (event: any) => void = () => {};

  let options = defaultOpts;
  let textSelection = null; // Track text selection from TextDisplay
  let previousTransformId = step.transform_id; // Track previous transform for change detection

  // Map display names to component instances
  const displayComponents = {
    'TextDisplay': TextDisplay,
    'BinaryDisplay': BinaryDisplay,
    'TreeDisplay': TreeDisplay
  };

  // Get the actual component from the display name
  $: currentComponent = displayComponents[step.curr] || TextDisplay;

  // Analysis results
  let results = [];

  onMount(() => {
    console.log('[Step] Analyzing on main thread');
    triggerAnalysis();
  });

  function triggerAnalysis() {
    console.log('[Step] Running analysis on main thread');
    results = analyze(step, options);
  }

  // Reactive trigger for analysis when step content or options change
  $: if (step && step.content !== undefined && step.curr) {
    triggerAnalysis();
  }

  $: selected_result = results.find((r) => r.from_id === step.transform_id);

  function handleTransformSelect(transformId: string) {
    // Detect if this is a transform change (not initial selection)
    const isTransformChange = previousTransformId !== null && previousTransformId !== transformId;

    step.transform_id = transformId;
    previousTransformId = transformId;

    // Find the selected result
    const result = results.find((r) => r.from_id === transformId);
    if (result && result.content !== undefined) {
      console.log(`[Step ${index}] Transform applied:`, {
        transformId,
        resultContent: result.content,
        resultType: typeof result.content,
        resultDisplay: result.display,
        isTransformChange
      });

      // Store the inverse function with this step for later use
      step.inverse = result.inverse;

      // Pass the result back to parent for creating the next step
      // Include the display component for the next step
      onupdate({ detail: {
        index,
        result: {
          ...result,
          nextComponent: result.display
        },
        clearSubsequent: isTransformChange // Signal to clear subsequent steps if transform changed
      } });
      return;
    }

    // Transform failed - still pass clearSubsequent flag if transform changed
    onupdate({ detail: { index, clearSubsequent: isTransformChange } });
  }

  function handleContentChange(event: any) {
    // Use explicit undefined check instead of || to allow empty strings
    const newContent = event.detail?.content !== undefined ? event.detail.content : event.detail;
    step.content = newContent;
    onupdate({ detail: { index } });
  }

  // Handle path selection from TreeDisplay
  function handlePathSelect(event: any) {
    const { path, value } = event.detail;
    console.log(`[Step ${index}] Path selected:`, { path, value });

    // Detect if this is a transform change
    const isTransformChange = previousTransformId !== null && previousTransformId !== 'jsonpath_select';

    // Store the path as options for this step
    step.options = path;

    // Update local options for jsonpath_select transform
    const newOptions = {
      ...options,
      jsonpath_select: path
    };

    console.log(`[Step ${index}] Calling analyze with:`, {
      stepContent: step.content,
      stepCurr: step.curr,
      options: newOptions
    });

    // Re-analyze with the new options to get updated results
    const newResults = analyze(step, newOptions);
    console.log(`[Step ${index}] Analyze returned ${newResults.length} results:`, newResults.map(r => r.from_id));

    const result = newResults.find((r) => r.from_id === 'jsonpath_select');
    console.log(`[Step ${index}] Found jsonpath_select result:`, result);

    if (result && result.content !== undefined) {
      console.log(`[Step ${index}] JSONPath transform applied:`, {
        path,
        resultContent: result.content,
        resultType: typeof result.content,
        resultDisplay: result.display,
        isTransformChange
      });

      // Set the transform_id and store the inverse
      step.transform_id = 'jsonpath_select';
      step.inverse = result.inverse;
      previousTransformId = 'jsonpath_select';

      // Pass the result back to parent for creating the next step
      onupdate({ detail: {
        index,
        result: {
          ...result,
          nextComponent: result.display
        },
        clearSubsequent: isTransformChange
      } });
    } else {
      console.error(`[Step ${index}] jsonpath_select result is invalid:`, {
        resultExists: !!result,
        contentExists: result?.content !== undefined,
        result
      });
    }
  }

  // Handle selection change from TextDisplay
  function handleSelectionChange(event: any) {
    textSelection = event.detail;
    console.log(`[Step ${index}] Selection changed:`, textSelection);
  }

  // Handle extracting the current text selection
  function handleExtractSelection() {
    if (textSelection) {
      handleTextSelect({ detail: textSelection });
    }
  }

  // Handle text selection from TextDisplay (when extract is triggered)
  function handleTextSelect(event: any) {
    const { text, start, end } = event.detail;
    console.log(`[Step ${index}] Text selected:`, { text, start, end });

    // Detect if this is a transform change
    const isTransformChange = previousTransformId !== null && previousTransformId !== 'substring_select';

    // Store the substring range as options for this step
    const substringOptions = JSON.stringify({ start, end });
    step.options = substringOptions;

    // Update local options for substring_select transform
    const newOptions = {
      ...options,
      substring_select: substringOptions
    };

    console.log(`[Step ${index}] Calling analyze for substring with:`, {
      stepContent: step.content,
      options: newOptions
    });

    // Re-analyze with the new options to get updated results
    const newResults = analyze(step, newOptions);
    console.log(`[Step ${index}] Analyze returned ${newResults.length} results:`, newResults.map(r => r.from_id));

    const result = newResults.find((r) => r.from_id === 'substring_select');
    console.log(`[Step ${index}] Found substring_select result:`, result);

    if (result && result.content !== undefined) {
      console.log(`[Step ${index}] Substring transform applied:`, {
        start,
        end,
        resultContent: result.content,
        resultType: typeof result.content,
        resultDisplay: result.display,
        isTransformChange
      });

      // Set the transform_id and store the inverse
      step.transform_id = 'substring_select';
      step.inverse = result.inverse;
      previousTransformId = 'substring_select';

      // Pass the result back to parent for creating the next step
      onupdate({ detail: {
        index,
        result: {
          ...result,
          nextComponent: result.display
        },
        clearSubsequent: isTransformChange
      } });
    } else {
      console.error(`[Step ${index}] substring_select result is invalid:`, {
        resultExists: !!result,
        contentExists: result?.content !== undefined,
        result
      });
    }
  }
</script>

<div>
  <!-- Display current step content (editable) -->
  <svelte:component
    this={currentComponent}
    bind:content={step.content}
    on:content-change={handleContentChange}
    on:path-select={handlePathSelect}
    on:selection-change={handleSelectionChange}
  />
  
  <!-- Transform menu -->
  <div class="transform-menu">
    <!-- Extract Selection option (shown when text is selected) -->
    {#if textSelection}
      <button
        class="transform-label extract-selection"
        class:selected={step.transform_id === 'substring_select'}
        on:click={handleExtractSelection}
        title="Extract selected text to new step"
      >
        Extract Selection
      </button>
    {/if}

    <!-- Regular transforms -->
    {#each results.filter(r => r.from_id !== 'jsonpath_select' && r.from_id !== 'substring_select') as result, idx (idx)}
      <input
        type="radio"
        bind:group={step.transform_id}
        id={index + "-" + idx + "-transform"}
        value={result.from_id}
        class="transform-radio"
        on:change={() => handleTransformSelect(result.from_id)}
      />
      <label
        for={index + "-" + idx + "-transform"}
        class="transform-label"
      >
        {Math.round(result.score * 100) + "% "}
        {result.from_name}
      </label>
    {/each}
  </div>

  <!-- Error message if transform failed -->
  {#if selected_result && selected_result.message}
    <div>
      <small class="error">{selected_result.message}</small>
    </div>
  {/if}
</div>

<style>
  .transform-menu {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .transform-radio {
    display: none;
  }

  .transform-radio:checked + .transform-label {
    filter: invert(1);
  }

  .transform-label {
    background-color: white;
    border: solid thin;
    border-radius: 0.3em;
    padding: 0.1em;
    margin: 0.2em;
  }

  .extract-selection {
    cursor: pointer;
  }

  .extract-selection.selected {
    filter: invert(1);
  }

  .error {
    color: red;
  }
</style>
